/**
 * monacoLspBridge.ts
 *
 * LSP (Language Server Protocol) ile Monaco Editor arasindaki kopru.
 *
 * LSP ve Monaco farkli type sistemleri kullaniyor:
 *   - LSP pozisyon:  { line: 0, character: 5 }   (0-indexed)
 *   - Monaco pozisyon: { lineNumber: 1, column: 6 } (1-indexed)
 *   - LSP CompletionItemKind numaralari ≠ Monaco CompletionItemKind numaralari
 *   - LSP DiagnosticSeverity ≠ Monaco MarkerSeverity
 *
 * Bu dosya 4 sey yapar:
 *   1. CompletionProvider — kullanici yazarken LSP'den oneri ister, Monaco formatina cevirir
 *   2. HoverProvider — fare ile uzerine gelince LSP'den bilgi ister
 *   3. Diagnostics — LSP'den gelen hata/uyarilari Monaco marker'larina cevirir
 *   4. Text Sync — Monaco'daki degisiklikleri LSP'ye bildirir
 */

import type { LspConnection } from '@qualified/lsp-connection';
import type * as lspTypes from 'vscode-languageserver-protocol';
import { DOCUMENT_URI, notifyChange } from './lspClient';

type Monaco = typeof import('monaco-editor');
type MonacoEditor = import('monaco-editor').editor.IStandaloneCodeEditor;

// ============================================================================
// TIP CEVIRME YARDIMCILARI (LSP ↔ Monaco)
// ============================================================================

/**
 * LSP pozisyonunu Monaco pozisyonuna cevirir.
 * LSP: 0-indexed (line: 0 = ilk satir, character: 0 = ilk karakter)
 * Monaco: 1-indexed (lineNumber: 1, column: 1)
 */
function lspPosToMonaco(pos: lspTypes.Position) {
  return { lineNumber: pos.line + 1, column: pos.character + 1 };
}

/**
 * Monaco pozisyonunu LSP pozisyonuna cevirir.
 */
function monacoPosToLsp(pos: { lineNumber: number; column: number }): lspTypes.Position {
  return { line: pos.lineNumber - 1, character: pos.column - 1 };
}

/**
 * LSP range'ini Monaco range'ine cevirir.
 */
function lspRangeToMonaco(range: lspTypes.Range): import('monaco-editor').IRange {
  const start = lspPosToMonaco(range.start);
  const end = lspPosToMonaco(range.end);
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  };
}

/**
 * LSP CompletionItemKind → Monaco CompletionItemKind
 *
 * LSP ve Monaco farkli numaralar kullaniyor:
 *   LSP:    1=Text, 2=Method, 3=Function, 6=Variable, 7=Class, 14=Keyword ...
 *   Monaco: 0=Method, 1=Function, 4=Variable, 5=Class, 17=Keyword, 18=Text ...
 */
function mapCompletionKind(
  lspKind: number | undefined,
  monaco: Monaco
): import('monaco-editor').languages.CompletionItemKind {
  const m = monaco.languages.CompletionItemKind;
  const map: Record<number, import('monaco-editor').languages.CompletionItemKind> = {
    1: m.Text,
    2: m.Method,
    3: m.Function,
    4: m.Constructor,
    5: m.Field,
    6: m.Variable,
    7: m.Class,
    8: m.Interface,
    9: m.Module,
    10: m.Property,
    11: m.Unit,
    12: m.Value,
    13: m.Enum,
    14: m.Keyword,
    15: m.Snippet,
    16: m.Color,
    17: m.File,
    18: m.Reference,
    19: m.Folder,
    20: m.EnumMember,
    21: m.Constant,
    22: m.Struct,
    23: m.Event,
    24: m.Operator,
    25: m.TypeParameter,
  };
  return map[lspKind ?? 1] ?? m.Text;
}

/**
 * LSP DiagnosticSeverity → Monaco MarkerSeverity
 *
 * LSP:    1=Error, 2=Warning, 3=Information, 4=Hint
 * Monaco: 8=Error, 4=Warning, 2=Info, 1=Hint
 */
function mapDiagnosticSeverity(
  severity: number | undefined,
  monaco: Monaco
): import('monaco-editor').MarkerSeverity {
  switch (severity) {
    case 1: return monaco.MarkerSeverity.Error;
    case 2: return monaco.MarkerSeverity.Warning;
    case 3: return monaco.MarkerSeverity.Info;
    case 4: return monaco.MarkerSeverity.Hint;
    default: return monaco.MarkerSeverity.Info;
  }
}

/**
 * LSP MarkupContent veya string'i Monaco IMarkdownString[]'e cevirir.
 * Hover ve completion documentation icin kullanilir.
 */
function markupToMonaco(
  content: string | lspTypes.MarkupContent | (string | lspTypes.MarkedString)[] | undefined
): import('monaco-editor').IMarkdownString[] {
  if (!content) return [];

  // string → tek eleman
  if (typeof content === 'string') {
    return [{ value: content }];
  }

  // MarkupContent { kind: 'markdown'|'plaintext', value: string }
  if ('kind' in content && 'value' in content) {
    return [{ value: content.value }];
  }

  // Array of (string | MarkedString)
  if (Array.isArray(content)) {
    return content.map((c) => {
      if (typeof c === 'string') return { value: c };
      // MarkedString: { language: string, value: string }
      return { value: `\`\`\`${c.language}\n${c.value}\n\`\`\`` };
    });
  }

  return [];
}

/**
 * LSP InsertTextFormat:
 *   1 = PlainText (oldugu gibi ekle)
 *   2 = Snippet ($1, $0 gibi placeholder'lar var)
 */
function insertTextRules(
  format: number | undefined,
  monaco: Monaco
): import('monaco-editor').languages.CompletionItemInsertTextRule | undefined {
  if (format === 2) {
    return monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  }
  return undefined;
}

// ============================================================================
// ANA BRIDGE FONKSIYONU
// ============================================================================

/**
 * LSP connection'i Monaco Editor'e baglar.
 *
 * 4 sey register eder:
 *   1. CompletionProvider — autocomplete
 *   2. HoverProvider — fare hover bilgisi
 *   3. Diagnostics listener — hata/uyari altcizgileri
 *   4. Text sync — editor degisikliklerini LSP'ye bildirir
 *
 * @returns Dispose fonksiyonu — cleanup icin (component unmount)
 */
export function bridgeLspToMonaco(
  monaco: Monaco,
  editor: MonacoEditor,
  lsp: LspConnection
): import('monaco-editor').IDisposable {
  const disposables: import('monaco-editor').IDisposable[] = [];

  // --------------------------------------------------------------------------
  // 1. COMPLETION PROVIDER — Autocomplete
  // --------------------------------------------------------------------------
  // Kullanici yazarken Monaco bu provider'i cagiriyor.
  // Biz LSP'ye completion request gonderip sonucu Monaco formatina ceviriyoruz.
  disposables.push(
    monaco.languages.registerCompletionItemProvider('php', {
      // Bu karakterler yazildiginda otomatik completion tetiklenir
      triggerCharacters: ['$', '\\', '>', ':'],

      async provideCompletionItems(model, position) {
        // Monaco pozisyonunu LSP pozisyonuna cevir (1-indexed → 0-indexed)
        const lspPos = monacoPosToLsp(position);

        // LSP'ye "bu pozisyonda ne onerebilirsin?" diye sor
        const result = await lsp.getCompletion({
          textDocument: { uri: DOCUMENT_URI },
          position: lspPos,
        });

        if (!result) return { suggestions: [] };

        // Sonuc CompletionList veya CompletionItem[] olabilir
        const items = Array.isArray(result) ? result : result.items;

        // Cursor'un bulundugu kelimenin range'i
        const word = model.getWordUntilPosition(position);
        const defaultRange: import('monaco-editor').IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Her LSP CompletionItem → Monaco CompletionItem
        const suggestions: import('monaco-editor').languages.CompletionItem[] = items.map(
          (item) => {
            const range = item.textEdit && 'range' in item.textEdit
              ? lspRangeToMonaco(item.textEdit.range)
              : defaultRange;

            return {
              label: item.label,
              kind: mapCompletionKind(item.kind, monaco),
              detail: item.detail ?? '',
              documentation: item.documentation
                ? markupToMonaco(item.documentation as string | lspTypes.MarkupContent)[0]
                : undefined,
              insertText: item.textEdit
                ? ('newText' in item.textEdit ? item.textEdit.newText : item.insertText ?? item.label)
                : (item.insertText ?? item.label),
              insertTextRules: insertTextRules(item.insertTextFormat, monaco),
              range,
              sortText: item.sortText,
              filterText: item.filterText,
              preselect: item.preselect,
            };
          }
        );

        return { suggestions };
      },
    })
  );

  // --------------------------------------------------------------------------
  // 2. HOVER PROVIDER — Fare ile uzerine gelince bilgi goster
  // --------------------------------------------------------------------------
  disposables.push(
    monaco.languages.registerHoverProvider('php', {
      async provideHover(_model, position) {
        const result = await lsp.getHoverInfo({
          textDocument: { uri: DOCUMENT_URI },
          position: monacoPosToLsp(position),
        });

        if (!result) return null;

        return {
          contents: markupToMonaco(result.contents as string | lspTypes.MarkupContent),
          range: result.range ? lspRangeToMonaco(result.range) : undefined,
        };
      },
    })
  );

  // --------------------------------------------------------------------------
  // 3. DIAGNOSTICS — Hata ve uyari altcizgileri (kirmizi/sari)
  // --------------------------------------------------------------------------
  // LSP sunucusu kod analiz ettikce publishDiagnostics notification gonderir.
  // Biz bunlari Monaco marker'larina ceviriyoruz.
  lsp.onDiagnostics((params) => {
    if (params.uri !== DOCUMENT_URI) return;

    const model = editor.getModel();
    if (!model) return;

    const markers: import('monaco-editor').editor.IMarkerData[] = params.diagnostics.map(
      (diag) => ({
        severity: mapDiagnosticSeverity(diag.severity, monaco),
        message: diag.message,
        startLineNumber: diag.range.start.line + 1,
        startColumn: diag.range.start.character + 1,
        endLineNumber: diag.range.end.line + 1,
        endColumn: diag.range.end.character + 1,
        source: diag.source ?? 'intelephense',
        code: typeof diag.code === 'number' || typeof diag.code === 'string'
          ? String(diag.code)
          : undefined,
      })
    );

    monaco.editor.setModelMarkers(model, 'php-lsp', markers);
  });

  // --------------------------------------------------------------------------
  // 4. TEXT SYNC — Editor degisikliklerini LSP'ye bildir
  // --------------------------------------------------------------------------
  disposables.push(
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (!model) return;
      notifyChange(model.getValue());
    })
  );

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------
  return {
    dispose() {
      for (const d of disposables) d.dispose();
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelMarkers(model, 'php-lsp', []);
      }
    },
  };
}

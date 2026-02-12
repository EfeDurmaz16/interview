/**
 * phpSnippets.ts
 *
 * Interview'a ozel PHP snippet'leri.
 * Keyword completion, builtin functions, hover, symbol extraction
 * artik Intelephense (LSP) tarafindan saglaniyor.
 * Bu dosya sadece interview'a ozel snippet'leri register eder.
 */

type Monaco = typeof import('monaco-editor');

const PHP_SNIPPETS = [
  {
    label: 'solution()',
    detail: 'Interview stub',
    insertText: ['function solution() {', '\t$0', '}'].join('\n'),
  },
  {
    label: 'foreach',
    detail: 'Loop over array',
    insertText: ['foreach (${1:$array} as ${2:$value}) {', '\t$0', '}'].join('\n'),
  },
  {
    label: 'if',
    detail: 'Conditional',
    insertText: ['if (${1:condition}) {', '\t$0', '}'].join('\n'),
  },
  {
    label: 'try/catch',
    detail: 'Exception handling',
    insertText: ['try {', '\t$0', '} catch (\\Throwable $e) {', '\t// ...', '}'].join('\n'),
  },
] as const;

/**
 * Monaco'ya interview-specific PHP snippet'lerini register eder.
 * Intelephense'in saglamadigi ozel snippet'ler icin kullanilir.
 *
 * @returns Dispose edilebilir handle (cleanup icin)
 */
export function registerPhpSnippets(monaco: Monaco): import('monaco-editor').IDisposable {
  return monaco.languages.registerCompletionItemProvider('php', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: import('monaco-editor').languages.CompletionItem[] = [];

      for (const s of PHP_SNIPPETS) {
        suggestions.push({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: s.detail,
          insertText: s.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        });
      }

      return { suggestions };
    },
  });
}

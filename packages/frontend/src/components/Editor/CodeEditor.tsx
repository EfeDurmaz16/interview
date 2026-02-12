import Editor from '@monaco-editor/react';
import EditorToolbar from './EditorToolbar';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { OnMount } from '@monaco-editor/react';
import { registerPhpSnippets } from '../../services/phpSnippets';
import { connectLsp, disconnectLsp } from '../../services/lspClient';
import { bridgeLspToMonaco } from '../../services/monacoLspBridge';

const LANGUAGE_MAP: Record<string, string> = {
  PHP: 'php',
};

const DEFAULT_CODE: Record<string, string> = {
  PHP: '<?php\n// Write your solution here\nfunction solution() {\n  \n}\n',
};

interface CodeEditorProps {
  onRun?: ((code: string, language: string) => void) | (() => void);
  onSubmit?: ((code: string, language: string) => void) | (() => void);
  onCodeChange?: (code: string) => void;
  onClear?: () => void;
  externalCode?: string;
  showSubmit?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
}

export default function CodeEditor({
  onRun,
  onSubmit,
  onCodeChange,
  onClear,
  externalCode,
  showSubmit,
  readOnly,
  disabled,
}: CodeEditorProps) {
  const [language, setLanguage] = useState('PHP');
  const [code, setCode] = useState(externalCode ?? DEFAULT_CODE['PHP'] ?? '');
  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const hasSetupIntellisense = useRef(false);
  // LSP bridge disposable — cleanup icin
  const lspBridgeRef = useRef<import('monaco-editor').IDisposable | null>(null);

  // LSP baglantisini component unmount'ta temizle
  useEffect(() => {
    return () => {
      lspBridgeRef.current?.dispose();
      disconnectLsp();
    };
  }, []);

  // Sync code from external source (e.g. WebSocket)
  useEffect(() => {
    if (externalCode !== undefined && externalCode !== code) {
      setCode(externalCode);
    }
  }, [externalCode]);

  const handleChange = (val: string | undefined) => {
    if (readOnly) return;
    const newCode = val ?? '';
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang] ?? `// ${lang}\n`);
  };

  const handleClear = () => {
    if (readOnly || disabled) return;
    const newCode = DEFAULT_CODE[language] ?? '';
    setCode(newCode);
    onCodeChange?.(newCode);
    onClear?.();
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startWidth = containerRef.current?.getBoundingClientRect().width ?? 500;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const newWidth = Math.min(
        Math.max(startWidth + (ev.clientX - startX), 350),
        1200
      );
      setEditorWidth(newWidth);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleMount = useCallback<OnMount>((editorInstance, monaco) => {
    if (hasSetupIntellisense.current) return;
    hasSetupIntellisense.current = true;

    // 1) Snippet'leri hemen register et (senkron, aninda kullanilabilir)
    registerPhpSnippets(monaco);

    // 2) LSP'yi arka planda baglat (asenkron — WebSocket + handshake)
    // Editor zaten snippet'lerle calisiyor, LSP hazir olunca
    // completion/hover/diagnostics da aktif olacak
    const currentCode = editorInstance.getModel()?.getValue() ?? '<?php\n';
    connectLsp(currentCode)
      .then((lsp) => {
        // 3) LSP hazir — Monaco'ya bagla
        lspBridgeRef.current = bridgeLspToMonaco(monaco, editorInstance, lsp);
        console.log('[LSP] Connected and bridged to Monaco');
      })
      .catch((err) => {
        // LSP baglanamazsa editor yine calisir, sadece snippet'lerle
        console.warn('[LSP] Connection failed, falling back to snippets only:', err);
      });
  }, []);

  return (
    <div
      ref={containerRef}
      className="editor-container"
      style={{
        flex: editorWidth ? 'none' : 1,
        width: editorWidth ?? undefined,
        minWidth: 350,
        maxWidth: 1200,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <EditorToolbar
        code={code}
        language={language}
        languages={Object.keys(LANGUAGE_MAP)}
        disabled={disabled}
        onLanguageChange={handleLanguageChange}
        onRun={() => onRun?.(code, language)}
        onClear={handleClear}
        onSubmit={showSubmit ? () => onSubmit?.(code, language) : undefined}
      />
      <div className="editor-header">
        <span className="editor-header__filename">solution.php</span>
      </div>
      <Editor
        height="100%"
        language={LANGUAGE_MAP[language]}
        value={code}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleMount}
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'Monaco', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 12 },
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          tabSize: 4,
          readOnly: !!readOnly,
          quickSuggestions: { other: true, comments: false, strings: true },
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: 'matchingDocuments',
        }}
      />
      {/* Drag handle */}
      <div className="resize-handle resize-handle--right" onMouseDown={handleMouseDown} />
    </div>
  );
}

import Editor from '@monaco-editor/react';
import EditorToolbar from './EditorToolbar';
import { useState } from 'react';

const LANGUAGE_MAP: Record<string, string> = {
  php: 'php',
};

const DEFAULT_CODE: Record<string, string> = {
  php: '<?php\n// Write your solution here\nfunction solution() {\n  \n}\n',
};

interface CodeEditorProps {
  onRun?: (code: string, language: string) => void;
  onSubmit?: (code: string, language: string) => void;
  showSubmit?: boolean;
}

export default function CodeEditor({ onRun, onSubmit, showSubmit }: CodeEditorProps) {
  const [language, setLanguage] = useState('php');
  const [code, setCode] = useState(DEFAULT_CODE['php'] ?? '');

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang] ?? `// ${lang}\n`);
  };

  return (
    <div className="editor-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <EditorToolbar
        language={language}
        languages={Object.keys(LANGUAGE_MAP)}
        onLanguageChange={handleLanguageChange}
        onRun={() => onRun?.(code, language)}
        onClear={() => setCode('')}
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
        onChange={(val) => setCode(val ?? '')}
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'Monaco', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 12 },
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          tabSize: 4,
        }}
      />
    </div>
  );
}

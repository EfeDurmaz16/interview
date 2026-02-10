import { useState, useCallback, useEffect, useMemo } from 'react';
import CodeEditor from './CodeEditor';
import WhiteboardEditor from './WhiteboardEditor';
import { createTLStore, defaultShapeUtils, type TLEditorSnapshot } from '@tldraw/tldraw';
import './EditorWithWhiteboard.css';

type EditorMode = 'code' | 'whiteboard';

interface EditorWithWhiteboardProps {
  // Code editor props
  onRun?: ((code: string, language: string) => void) | (() => void);
  onSubmit?: ((code: string, language: string) => void) | (() => void);
  onCodeChange?: (code: string) => void;
  onClear?: () => void;
  externalCode?: string;
  showSubmit?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  
  // Whiteboard props
  onWhiteboardChange?: (snapshot: TLEditorSnapshot) => void;
  externalWhiteboardSnapshot?: TLEditorSnapshot | null;
  
  // Mode control
  initialMode?: EditorMode;
}

export default function EditorWithWhiteboard({
  onRun,
  onSubmit,
  onCodeChange,
  onClear,
  externalCode,
  showSubmit,
  readOnly,
  disabled,
  onWhiteboardChange,
  externalWhiteboardSnapshot,
  initialMode = 'code'
}: EditorWithWhiteboardProps) {
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [codeState, setCodeState] = useState<string>(externalCode || '');
  const [whiteboardState, setWhiteboardState] = useState<TLEditorSnapshot | null>(null);
  
  // Create a single shared store for tldraw
  const whiteboardStore = useMemo(() => {
    return createTLStore({ shapeUtils: defaultShapeUtils });
  }, []);

  // Update local code state when external changes
  useEffect(() => {
    if (externalCode !== undefined) {
      setCodeState(externalCode);
    }
  }, [externalCode]);

  // Update local whiteboard state when external changes
  useEffect(() => {
    if (externalWhiteboardSnapshot) {
      setWhiteboardState(externalWhiteboardSnapshot);
    }
  }, [externalWhiteboardSnapshot]);

  const handleCodeChange = useCallback((code: string) => {
    setCodeState(code);
    onCodeChange?.(code);
  }, [onCodeChange]);

  const handleWhiteboardChange = useCallback((snapshot: TLEditorSnapshot) => {
    setWhiteboardState(snapshot);
    onWhiteboardChange?.(snapshot);
  }, [onWhiteboardChange]);

  const handleExportWhiteboard = useCallback(async () => {
    if (typeof (window as any).__exportWhiteboard === 'function') {
      return await (window as any).__exportWhiteboard();
    }
    return null;
  }, []);

  const enhancedOnSubmit = useCallback(async (code: string, language: string) => {
    // Export whiteboard snapshot if available
    if (whiteboardState) {
      const whiteboardImage = await handleExportWhiteboard();
      // Store the whiteboard image for submission
      (window as any).__lastWhiteboardSnapshot = whiteboardImage;
    }
    
    // Call original submit handler
    if (onSubmit) {
      if (onSubmit.length === 2) {
        (onSubmit as (code: string, language: string) => void)(code, language);
      } else {
        (onSubmit as () => void)();
      }
    }
  }, [onSubmit, whiteboardState, handleExportWhiteboard]);

  return (
    <div className="editor-with-whiteboard" style={{ position: 'relative' }}>
      <div className="editor-mode-toggle">
        <button
          className={`mode-btn ${mode === 'code' ? 'active' : ''}`}
          onClick={() => setMode('code')}
          disabled={disabled}
          title="Code Editor"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="currentColor"/>
          </svg>
        </button>
        <button
          className={`mode-btn ${mode === 'whiteboard' ? 'active' : ''}`}
          onClick={() => setMode('whiteboard')}
          disabled={disabled}
          title="Whiteboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      
      <div className="editor-content" style={{ display: mode === 'code' ? 'flex' : 'none', height: '100%' }}>
        <CodeEditor
          onRun={onRun}
          onSubmit={enhancedOnSubmit}
          onCodeChange={handleCodeChange}
          onClear={onClear}
          externalCode={codeState}
          showSubmit={showSubmit}
          readOnly={readOnly}
          disabled={disabled}
        />
      </div>
      
      <div className="whiteboard-content" style={{ display: mode === 'whiteboard' ? 'block' : 'none', height: '100%' }}>
        <WhiteboardEditor
          onContentChange={handleWhiteboardChange}
          externalSnapshot={whiteboardState || externalWhiteboardSnapshot}
          readOnly={readOnly || disabled}
          onExport={handleExportWhiteboard}
          store={whiteboardStore}
        />
      </div>
    </div>
  );
}
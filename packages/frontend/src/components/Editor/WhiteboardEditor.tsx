import { Tldraw, type Editor, type TLEditorSnapshot, type TLStore } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect, useRef, useCallback } from 'react';
import { throttle } from 'lodash-es';

interface WhiteboardEditorProps {
  onContentChange?: (snapshot: TLEditorSnapshot) => void;
  externalSnapshot?: TLEditorSnapshot | null;
  readOnly?: boolean;
  onExport?: () => Promise<string | null>;
  store: TLStore;
}

export default function WhiteboardEditor({ 
  onContentChange, 
  externalSnapshot,
  readOnly = false,
  onExport,
  store
}: WhiteboardEditorProps) {
  
  const editorRef = useRef<Editor | null>(null);
  const isUpdatingFromExternal = useRef(false);

  // Throttle change notifications to avoid flooding WebSocket
  const throttledOnChange = useCallback(
    throttle((editor: Editor) => {
      if (isUpdatingFromExternal.current || readOnly) return;
      
      const snapshot = editor.getSnapshot();
      console.log('[Whiteboard] Local change, sending snapshot');
      onContentChange?.(snapshot);
    }, 200),
    [onContentChange, readOnly]
  );

  // Handle external snapshot updates
  useEffect(() => {
    if (!externalSnapshot || !editorRef.current) return;
    
    console.log('[Whiteboard] Receiving snapshot:', externalSnapshot);
    isUpdatingFromExternal.current = true;
    editorRef.current.loadSnapshot(externalSnapshot);
    
    // Reset flag after a short delay
    setTimeout(() => {
      isUpdatingFromExternal.current = false;
    }, 200);
  }, [externalSnapshot]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    
    // Start with draw tool selected by default
    editor.setCurrentTool('draw');
    
    // Set up change listener
    const handleChange = () => throttledOnChange(editor);
    const unsubscribe = editor.store.listen(handleChange, { source: 'user' });
    
    // Export function for taking snapshots
    if (onExport) {
      (window as any).__exportWhiteboard = async () => {
        const shapeIds = Array.from(editor.getCurrentPageShapeIds());
        const result = await editor.getSvgElement(shapeIds);
        if (!result || !result.svg) return null;
        
        // Convert SVG to data URL
        const svgString = new XMLSerializer().serializeToString(result.svg);
        const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
        return dataUrl;
      };
    }
    
    return () => {
      unsubscribe();
      if (onExport) {
        delete (window as any).__exportWhiteboard;
      }
    };
  }, [throttledOnChange, onExport]);

  return (
    <div className="whiteboard-container" style={{ 
      width: '100%', 
      height: '500px',
      maxHeight: '500px',
      position: 'relative',
      backgroundColor: '#fafafa',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Tldraw
          store={store}
          onMount={handleMount}
          hideUi={false}
          inferDarkMode={false}
        />
      </div>
      {readOnly && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          userSelect: 'none',
        }} />
      )}
    </div>
  );
}
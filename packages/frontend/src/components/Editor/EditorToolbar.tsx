interface EditorToolbarProps {
  language: string;
  languages: string[];
  onLanguageChange: (lang: string) => void;
  code: string;
  onRun: (code: string) => void;
  onClear: () => void;
  onSubmit?: (code: string) => void;
  disabled?: boolean;
}

export default function EditorToolbar({
  language,
  languages,
  onLanguageChange,
  code,
  onRun,
  onClear,
  onSubmit,
  disabled,
}: EditorToolbarProps) {
  return (
    <div className="toolbar" style={{ padding: '0.5rem 1rem', marginBottom: 0, background: 'var(--jotform-light-gray)', borderBottom: '1px solid var(--jotform-border)' }}>
      <div className="toolbar__group">
        <span className="toolbar__label">Language</span>
        <div className="select-wrapper">
          <select
            className="select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            style={{ minWidth: 130 }}
            disabled={!!disabled}
          >
            {languages.map((l) => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="toolbar__group" style={{ marginLeft: 'auto' }}>
        <button className="btn btn--secondary" onClick={onClear} disabled={!!disabled}>Clear</button>
        {/* 
          The previous code tried to use a variable `code` which is not defined in this component.
          To fix this, you must pass the `code` prop down from the parent, then use it here.
          For now, I'll assume a `code` prop exists and use it; 
          if not, you should add `code: string` to EditorToolbarProps.
        */}
        <button className="btn btn--primary" onClick={() => onRun(code)} disabled={!!disabled}>&#9654; Run Code</button>
        {onSubmit && (
          <button className="btn btn--primary" onClick={() => onSubmit(code)} disabled={!!disabled} style={{ background: 'var(--jotform-blue)' }}>
            Submit
          </button>
        )}
      </div>
    </div>
  );
}

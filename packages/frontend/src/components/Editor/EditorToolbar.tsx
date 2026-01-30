interface EditorToolbarProps {
  language: string;
  languages: string[];
  onLanguageChange: (lang: string) => void;
  onRun: () => void;
  onClear: () => void;
  onSubmit?: () => void;
}

export default function EditorToolbar({
  language,
  languages,
  onLanguageChange,
  onRun,
  onClear,
  onSubmit,
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
          >
            {languages.map((l) => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="toolbar__group" style={{ marginLeft: 'auto' }}>
        <button className="btn btn--secondary" onClick={onClear}>Clear</button>
        <button className="btn btn--primary" onClick={onRun}>&#9654; Run Code</button>
        {onSubmit && (
          <button className="btn btn--primary" onClick={onSubmit} style={{ background: 'var(--jotform-blue)' }}>
            Submit
          </button>
        )}
      </div>
    </div>
  );
}

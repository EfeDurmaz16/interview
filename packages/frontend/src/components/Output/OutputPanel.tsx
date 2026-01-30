import { useState } from 'react';

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
}

interface OutputPanelProps {
  output?: string;
  error?: string;
  testResults?: TestResult[];
  isRunning?: boolean;
  executionTime?: number;
}

export default function OutputPanel({
  output = '',
  error = '',
  testResults = [],
  isRunning = false,
  executionTime,
}: OutputPanelProps) {
  const [tab, setTab] = useState<'output' | 'errors'>('output');

  return (
    <div className="output-panel">
      <div className="output-tabs">
        <button
          className={`output-tab${tab === 'output' ? ' output-tab--active' : ''}`}
          onClick={() => setTab('output')}
        >
          Output
        </button>
        <button
          className={`output-tab${tab === 'errors' ? ' output-tab--active' : ''}`}
          onClick={() => setTab('errors')}
        >
          Errors
        </button>
      </div>

      <div className={`output-content${!output && !error ? ' output-content--empty' : ''}${tab === 'errors' && error ? ' output-content--error' : ''}`}>
        {tab === 'output' ? (
          <>
            {output || 'Run your code to see output here...'}
            {testResults.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                {testResults.map((t, i) => (
                  <div key={i} className="test-result">
                    <span className={`test-result__icon test-result__icon--${t.passed ? 'pass' : 'fail'}`}>
                      {t.passed ? '✓' : '✗'}
                    </span>
                    <div className="test-result__details">
                      <div>Input: {t.input}</div>
                      <div>Expected: {t.expected}</div>
                      <div>Actual: {t.actual}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          error || 'No errors.'
        )}
      </div>

      <div className="status-bar">
        <div className="status-bar__item">
          <span className={`status-bar__indicator${isRunning ? ' status-bar__indicator--running' : ' status-bar__indicator--success'}`} />
          {isRunning ? 'Running...' : 'Ready'}
        </div>
        <div className="status-bar__item">
          {executionTime !== undefined && `${executionTime}ms`}
          {!executionTime && 'Press Ctrl+Enter to run'}
        </div>
      </div>
    </div>
  );
}

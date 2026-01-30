import Header from '../components/Header/Header';
import IntervieweeSidebar from '../components/Sidebar/IntervieweeSidebar';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Output/OutputPanel';
import { useState } from 'react';

export default function IntervieweeView() {
  const [output, setOutput] = useState('');

  return (
    <>
      <Header showTimer />
      <div className="interview-layout">
        <IntervieweeSidebar />
        <div className="center-panel">
          <CodeEditor
            showSubmit
            onRun={(code) => setOutput(`> Running...\n${code.slice(0, 100)}...`)}
            onSubmit={(code, lang) => setOutput(`Submitted ${lang} solution (${code.length} chars)`)}
          />
          <OutputPanel output={output} />
        </div>
      </div>
    </>
  );
}

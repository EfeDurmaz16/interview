import Header from '../components/Header/Header';
import IntervieweeSidebar from '../components/Sidebar/IntervieweeSidebar';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Output/OutputPanel';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { useParams } from 'react-router-dom';

function IntervieweeContent() {
  const { code, output, error, isRunning, executionTime, handleCodeChange, handleRun, handleSubmit } = useEditor();

  return (
    <>
      <Header showTimer />
      <div className="interview-layout">
        <IntervieweeSidebar />
        <div className="center-panel">
          <CodeEditor
            showSubmit
            externalCode={code}
            onCodeChange={handleCodeChange}
            onRun={handleRun}
            onSubmit={handleRun}
          />
          <OutputPanel output={output} error={error} isRunning={isRunning} executionTime={executionTime} />
        </div>
      </div>
    </>
  );
}

export default function IntervieweeView() {
  const { token } = useParams<{ token: string }>();

  return (
    <EditorProvider token={token ?? ''}>
      <IntervieweeContent />
    </EditorProvider>
  );
}

interface IntervieweeSidebarProps {
  title?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  description?: string;
  examples?: { input: string; output: string }[];
  constraints?: string[];
}

const DEFAULT_PROPS: Required<IntervieweeSidebarProps> = {
  title: 'Two Sum',
  difficulty: 'easy',
  description:
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
  examples: [
    { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
    { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
  ],
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    '-10^9 <= target <= 10^9',
    'Only one valid answer exists.',
  ],
};

export default function IntervieweeSidebar(props: IntervieweeSidebarProps) {
  const { title, difficulty, description, examples, constraints } = {
    ...DEFAULT_PROPS,
    ...props,
  };

  return (
    <aside className="sidebar sidebar--interviewee">
      <div className="sidebar-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
          <span className={`badge badge--${difficulty}`}>{difficulty}</span>
        </div>
        <div className="problem-description">
          {description.split('\n').map((p, i) => (
            <p key={i} style={{ marginBottom: '0.5rem' }}>{p}</p>
          ))}

          <h3>Examples</h3>
          {examples.map((ex, i) => (
            <pre key={i}>
              <strong>Input:</strong> {ex.input}{'\n'}
              <strong>Output:</strong> {ex.output}
            </pre>
          ))}

          <h3>Constraints</h3>
          <ul>
            {constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

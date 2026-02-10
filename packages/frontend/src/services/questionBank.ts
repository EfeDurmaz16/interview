export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionTestCase = {
  input: string;
  expected_output: string;
  is_hidden: boolean;
};

export type QuestionEvaluationCriterion = {
  id: string;
  label: string;
  max_score: number;
};

export type QuestionBankQuestion = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: string;
  template_code: string;
  test_cases: QuestionTestCase[];
  evaluation_criteria: QuestionEvaluationCriterion[];
  session_id: string;
};

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function resolveInterviewTokenFromPath(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/interview\/([^/?#]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function buildQuestionBankAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const superadminToken = sessionStorage.getItem('superadmin_token');
  if (superadminToken) {
    return { Authorization: `Bearer ${superadminToken}` };
  }

  const interviewToken = resolveInterviewTokenFromPath();
  if (interviewToken) {
    return { Authorization: `Bearer ${interviewToken}` };
  }

  return {};
}

export async function fetchQuestionBank(): Promise<QuestionBankQuestion[]> {
  const res = await fetch('/api/questions/bank', {
    headers: {
      ...buildQuestionBankAuthHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to load question bank (${res.status})`);
  }

  const data = (await res.json()) as any[];
  if (!Array.isArray(data)) return [];

  return data
    .filter((q) => q && typeof q === 'object')
    .map((q) => {
      const testCases = Array.isArray(q.test_cases)
        ? (q.test_cases as QuestionTestCase[])
        : safeJsonParse<QuestionTestCase[]>(q.test_cases, []);

      const evaluationCriteria = Array.isArray(q.evaluation_criteria)
        ? (q.evaluation_criteria as QuestionEvaluationCriterion[])
        : safeJsonParse<QuestionEvaluationCriterion[]>(q.evaluation_criteria, []);

      return {
        id: String(q.id ?? ''),
        title: String(q.title ?? ''),
        description: String(q.description ?? ''),
        difficulty: (String(q.difficulty ?? 'easy') as Difficulty) || 'easy',
        category: String(q.category ?? ''),
        template_code: String(q.template_code ?? ''),
        test_cases: testCases,
        evaluation_criteria: evaluationCriteria,
        session_id: String(q.session_id ?? ''),
      } satisfies QuestionBankQuestion;
    })
    .filter((q) => q.id && q.title);
}

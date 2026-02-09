// Admin API service — wrappers for admin panel endpoints
import { showToast } from '../components/Toast';

function checkUnauthorized(res: Response): void {
  if (res.status === 401) {
    showToast('You are not authorized for this action');
    sessionStorage.removeItem('superadmin_token');
  }
}

export interface QuestionData {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  template_code: string;
  test_cases: string;
  evaluation_criteria: string;
  sort_order: number;
  session_id: string;
}

export interface SessionData {
  id: string;
  status: string;
  candidate_name: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface CreateSessionResult {
  session_id: string;
  interviewer_token: string;
  candidate_token: string;
  interviewer_url: string;
  candidate_url: string;
}

// --- Auth helpers ---

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('superadmin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function adminLogin(password: string): Promise<string> {
  const res = await fetch('/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Invalid password');
  const data = await res.json();
  return data.token;
}

// --- Questions ---

export async function fetchQuestions(): Promise<QuestionData[]> {
  const res = await fetch('/api/questions/bank');
  if (!res.ok) throw new Error('Failed to fetch questions');
  return res.json();
}

export async function createQuestion(data: {
  title: string;
  description: string;
  difficulty?: string;
  category?: string;
  template_code?: string;
}): Promise<QuestionData> {
  const res = await fetch('/api/admin/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ session_id: 'bank', ...data }),
  });
  checkUnauthorized(res);
  if (!res.ok) throw new Error('Failed to create question');
  return res.json();
}

export async function updateQuestion(id: string, data: Partial<{
  title: string;
  description: string;
  difficulty: string;
  category: string;
  template_code: string;
}>): Promise<QuestionData> {
  const res = await fetch(`/api/admin/questions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  checkUnauthorized(res);
  if (!res.ok) throw new Error('Failed to update question');
  return res.json();
}

export async function deleteQuestion(id: string): Promise<void> {
  const res = await fetch(`/api/admin/questions/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  checkUnauthorized(res);
  if (!res.ok) throw new Error('Failed to delete question');
}

// --- Sessions ---

export async function fetchSessions(): Promise<SessionData[]> {
  const res = await fetch('/api/admin/sessions', {
    headers: { ...authHeaders() },
  });
  checkUnauthorized(res);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function createSession(candidateName: string): Promise<CreateSessionResult> {
  const res = await fetch('/api/admin/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ candidate_name: candidateName }),
  });
  checkUnauthorized(res);
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/admin/sessions/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  checkUnauthorized(res);
  if (!res.ok) throw new Error('Failed to delete session');
}

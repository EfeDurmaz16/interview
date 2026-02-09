export enum WSMessageType {
    JOIN_SESSION = 'join_session',
    LEAVE_SESSION = 'leave_session',
    PEER_JOINED = 'peer_joined',
    PEER_LEFT = 'peer_left',
    ROOM_STATE = 'room_state',
    CODE_CHANGE = 'code_change',
    CURSOR_MOVE = 'cursor_move',
    SET_QUESTION = 'set_question',
    RUN_CODE = 'run_code',
    CODE_OUTPUT = 'code_output',
    SUBMIT_CODE = 'submit_code',
    SESSION_STARTED = 'session_started',
    SESSION_ENDED = 'session_ended',
    EVALUATION_UPDATE = 'evaluation_update',
    NAVIGATE_QUESTION = 'navigate_question',
    WHITEBOARD_INIT = 'whiteboard_init',
    WHITEBOARD_PATCH = 'whiteboard_patch',
    WHITEBOARD_SNAPSHOT = 'whiteboard_snapshot',
}

interface WSMessage<T> {
    type: WSMessageType;
    sessionId: string;
    userId: string;
    role: 'interviewer' | 'candidate' | 'interviewee';
    payload: T;
    timestamp: number;
}

interface Question{
    id: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    category?: string;
    templateCode: Record<string, string>;
    testCases?: TestCase[];
    evaluationCriteria: EvaluationCriterion[];
}

interface TestCase{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
}

interface EvaluationCriterion{
    id: string;
    label: string;
    maxScore: number;
    currentScore: number;
    notes?: string;
}

interface Session{
    id: string;
    interviewerId: string;
    intervieweeId: string;
    status: SessionStatus;
    questions: Question[];
    startTime: number;
    endTime: number;
}

interface Role{
    id: string;
    name: "interviewer" | "candidate" | "interviewee";
}

export type SessionStatus = 'waiting' | 'pending' | 'active' | 'ended' | 'completed';

export type QuestionLevel = 'intern' | 'junior' | 'senior';

export type QuestionKind = 'coding' | 'present';

export type ProjectFiles = Record<string, string>;

export interface ActiveQuestionPayload {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  level: QuestionLevel;
  kind: QuestionKind;
  templateCode: ProjectFiles;
  visibleTestCases: TestCase[];
  evaluationCriteria: EvaluationCriterion[];
}

export interface CodeChangePayload {
  files: ProjectFiles;
  activeFile: string;
  cursorPosition?: { line: number; column: number };
}

export interface WhiteboardPatchPayload {
  changes: unknown[];
  clientId: string;
  baseVersion?: number;
}

export interface ReportDto {
  session: {
    id: string;
    candidateName: string;
    interviewerName: string;
    status: SessionStatus;
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number | null;
  };
  questions: Array<{
    id: string;
    title: string;
    level: QuestionLevel;
    kind: QuestionKind;
    difficulty: string;
    evaluation: {
      criteriaScores: Record<string, number>;
      notes: string;
    } | null;
    lastSubmission: {
      files: ProjectFiles;
      submittedAt: string;
    } | null;
  }>;
  whiteboardSnapshot: {
    base64Png: string;
    width: number;
    height: number;
  } | null;
}

export type UserRole = 'interviewer' | 'admin' | 'superadmin';

export type { WSMessage, Question, TestCase, EvaluationCriterion, Session, Role };

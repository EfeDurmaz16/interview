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
    status: "waiting" | "pending" | "active" | "ended" | "completed";
    questions: Question[];
    startTime: number;
    endTime: number;
}

interface Role{
    id: string;
    name: "interviewer" | "candidate" | "interviewee";
}

export type { WSMessage, Question, TestCase, EvaluationCriterion, Session, Role };

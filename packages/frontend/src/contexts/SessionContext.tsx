import type { Question, Session, Role } from '@jotform-interview/shared';
import { createContext, useState, type Dispatch, type SetStateAction } from 'react';

export const SessionContext = createContext<{
  session: Session | null;
  setSession: Dispatch<SetStateAction<Session | null>>;
  questions: Question[];
  setQuestions: Dispatch<SetStateAction<Question[]>>;
  currentQuestion: Question | null;
  setCurrentQuestion: Dispatch<SetStateAction<Question | null>>;
  role: Role | null;
  setRole: Dispatch<SetStateAction<Role | null>>;
  ws: WebSocket | null;
  setWs: Dispatch<SetStateAction<WebSocket | null>>;
} | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  return (
    <SessionContext.Provider
      value={{
        session,
        setSession,
        questions,
        setQuestions,
        currentQuestion,
        setCurrentQuestion,
        role,
        setRole,
        ws,
        setWs,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

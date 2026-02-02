import type { Question, Session, Role } from '@jotform-interview/shared';
import { createContext, useState, useEffect } from 'react';

export const [sessionContext, setSessionContext] = useState<Session | null>(null);

export const SessionContext = createContext<{
  session: Session | null;
  questions: Question[];
  currentQuestion: Question | null;
  role: Role | null;
  ws: WebSocket | null;
  setCurrentQuestion: (question: Question) => void;
} | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

    
  
  useEffect(() => {
    const fetchSession = async () => {
      const response = await fetch(`/api/sessions/${session?.id}`);
      const data = await response.json();
      setSession(data);
    };
  }, []);
}
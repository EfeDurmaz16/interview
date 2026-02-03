import { useCallback, useEffect, useState } from "react";

export type ApiSession = {
  id: string;
  status?: string;
  createdAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  candidateName?: string | null;
};

export function useSession(sessionId?: string) {
    
    const [session, setSession] = useState<ApiSession | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
    if(!sessionId) return;
    setLoading(true);
    setError(null);
    try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const data = (await res.json()) as ApiSession;
        setSession(data);
    } catch (e: any) {
        setError(e?.message ?? "Failed to fetch session");
    } finally {
        setLoading(false);
    }
    }, [sessionId]);

    const startSession = useCallback(async () => {
        if(!sessionId) return;
        try {
            await fetch(`/api/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'start' }),
        }); 
        }finally {
            await refresh();
        }
    }, [refresh, sessionId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        session,
        loading,
        error,
        refresh,
        startSession,
    };
}

import { useWebSocket } from "./useWebSocket";
import { WSMessageType } from "@jotform-interview/shared";

export type NavPermission = 'none' | 'prev_only' | 'both';

export function useCodeSync(token: string) {
  const { sendMessage, lastMessage, status, wsUrl } = useWebSocket(token);

  const sendCodeChange = (code: string) => {
    sendMessage({
      type: WSMessageType.CODE_CHANGE,
      payload: { code },
    });
  };

  const sendRun = (code: string) => {
    sendMessage({
      type: WSMessageType.RUN_CODE,
      payload: { code },
    });
  };

  const sendSubmit = (code: string, questionId: string) => {
    sendMessage({
      type: WSMessageType.SUBMIT_CODE,
      payload: { code, question_id: questionId },
    });
  };

  const sendSetQuestion = (questionId: string) => {
    sendMessage({
      type: WSMessageType.SET_QUESTION,
      payload: { question_id: questionId },
    });
  };

  const sendSetQuestionWithNavPermission = (questionId: string, navPermission: NavPermission) => {
    sendMessage({
      type: WSMessageType.SET_QUESTION,
      payload: { question_id: questionId, nav_permission: navPermission },
    });
  };

  const sendCodeOutput = (result: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    executionTime?: number;
    error?: string;
  }) => {
    sendMessage({
      type: WSMessageType.CODE_OUTPUT,
      payload: result,
    });
  };

  const sendSessionStarted = (payload?: { started_at?: string; server_now?: string }) => {
    sendMessage({
      type: WSMessageType.SESSION_STARTED,
      payload: payload ?? {},
    });
  };

  const sendSessionEnded = (payload?: { reason?: string; server_now?: string }) => {
    sendMessage({
      type: WSMessageType.SESSION_ENDED,
      payload: payload ?? {},
    });
  };

  return {
    sendCodeChange,
    sendRun,
    sendSubmit,
    sendSetQuestion,
    sendSetQuestionWithNavPermission,
    sendCodeOutput,
    sendSessionStarted,
    sendSessionEnded,
    lastMessage,
    status,
    wsUrl,
  };
}

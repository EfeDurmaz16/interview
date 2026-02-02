import { useWebSocket } from "./useWebSocket";
import { WSMessageType } from "@jotform-interview/shared";


export function useCodeSync(token: string) {
  const { sendMessage, lastMessage, status } = useWebSocket(token);

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

  return {
    sendCodeChange,
    sendRun,
    sendSubmit,
    lastMessage,
    status,
  };
}
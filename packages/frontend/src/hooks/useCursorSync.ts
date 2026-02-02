import { useWebSocket } from "./useWebSocket";
import { WSMessageType } from "@jotform-interview/shared";

export function useCursorSync(token: string) {
  const { sendMessage, lastMessage, status } = useWebSocket(token);

  const sendCursorMove = (cursor: { line: number; column: number }) => {
    sendMessage({
      type: WSMessageType.CURSOR_MOVE,
      payload: cursor,
    });
  };

  return {
    sendCursorMove,
    lastMessage,
    status,
  };
}

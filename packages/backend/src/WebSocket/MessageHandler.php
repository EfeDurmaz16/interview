<?php

use Ratchet\ConnectionInterface as ConnectionInterface;

class MessageHandler {
    private ConnectionManager $connections;
    private TokenService $tokenService;
    private SessionService $sessionService;
    private CodeSnapshot $codeSnapshot;

    public function __construct(ConnectionManager $connections, SessionService $sessionService, CodeSnapshot $codeSnapshot) {
        $this->connections = $connections;
        $this->tokenService = new TokenService();
        $this->sessionService = $sessionService;
        $this->codeSnapshot = $codeSnapshot;
    }

    public function handleOpen(ConnectionInterface $conn, string $sessionId, string $userId, string $role): void {
        // Session info will be set on JOIN_SESSION message
    }

    public function handleMessage(ConnectionInterface $from, $msg): void {
        $message = json_decode($msg, true);
        if (!$message || !isset($message['type'])) return;

        $type = $message['type'];
        $payload = $message['payload'] ?? [];

        switch ($type) {
            case 'join_session':
                $this->onJoinSession($from, $payload);
                break;
            case 'code_change':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'cursor_move':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'run_code':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'code_output':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'set_question':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'submit_code':
                $this->onSubmitCode($from, $payload);
                break;
            case 'session_started':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'session_ended':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'evaluation_update':
                $this->onBroadcast($from, $type, $payload);
                break;
            default:
                break;
        }
    }

    private function onJoinSession(ConnectionInterface $conn, array $payload): void {
        $token = $payload['token'] ?? '';
        if (!$token) return;

        $resolved = $this->tokenService->resolveToken($token);
        if (!$resolved) return;

        $sessionId = $resolved['session_id'];
        $role = $resolved['role'];

        $this->connections->addToRoom($sessionId, $role, $conn);

        // Send current room state to the newly joined peer (for refresh/late-join scenarios)
        $conn->send(json_encode([
            'type' => 'room_state',
            'payload' => ['roles' => $this->connections->getRolesInRoom($sessionId)],
        ]));

        // Notify others that a peer joined
        $this->broadcastJson($sessionId, [
            'type' => 'peer_joined',
            'payload' => ['role' => $role],
        ], $conn);
    }

    private function onBroadcast(ConnectionInterface $from, string $type, array $payload): void {
        $info = $this->connections->getConnectionInfo($from);
        if (!$info) return;

        $sessionId = $info['session_id'] ?? null;
        if (!is_string($sessionId) || $sessionId === '') return;

        $this->broadcastJson($sessionId, [
            'type' => $type,
            'payload' => $payload,
            'role' => $info['role'] ?? '',
        ], $from);
    }

    private function onSubmitCode(ConnectionInterface $from, array $payload): void {
        $info = $this->connections->getConnectionInfo($from);
        if (!$info) return;

        $sessionId = $info['session_id'] ?? null;
        if (!is_string($sessionId) || $sessionId === '') return;

        $questionId = $payload['question_id'] ?? null;
        $code = $payload['code'] ?? null;

        if (is_string($questionId) && is_string($code)) {
            $this->codeSnapshot->create($sessionId, $questionId, $code, true);
        }

        $this->onBroadcast($from, 'submit_code', $payload);
    }

    private function broadcastJson(string $sessionId, array $data, ?ConnectionInterface $except = null): void {
        $json = json_encode($data);
        $this->connections->broadcast($sessionId, $json, $except);
    }

    public function handleClose(ConnectionInterface $conn): void {
        $info = $this->connections->removeConnection($conn);
        if (!$info) return;

        $sessionId = $info['session_id'];
        $role = $info['role'] ?? '';

        $this->broadcastJson($sessionId, [
            'type' => 'peer_left',
            'payload' => ['role' => $role],
        ]);

        // If interviewer disconnects, auto-end the session.
        if ($role === 'interviewer') {
            $this->sessionService->endSession($sessionId);
            $this->broadcastJson($sessionId, [
                'type' => 'session_ended',
                'payload' => ['reason' => 'interviewer_disconnected'],
            ]);
            return;
        }

        // If nobody is left in the room, mark session ended.
        if (!$this->connections->isRoomActive($sessionId)) {
            $this->sessionService->endSession($sessionId);
        }
    }

    public function handleError(ConnectionInterface $conn, \Exception $e): void {
        $this->handleClose($conn);
    }
}

?>

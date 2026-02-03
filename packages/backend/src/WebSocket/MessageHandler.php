<?php

use Ratchet\ConnectionInterface as ConnectionInterface;

class MessageHandler {
    private ConnectionManager $connections;
    private TokenService $tokenService;

    public function __construct(ConnectionManager $connections) {
        $this->connections = $connections;
        $this->tokenService = new TokenService();
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

        $conn->sessionId = $sessionId;
        $conn->role = $role;

        $this->connections->addToRoom($sessionId, $role, $conn);

        // Notify others that a peer joined
        $this->broadcastJson($sessionId, [
            'type' => 'peer_joined',
            'payload' => ['role' => $role],
        ], $conn);
    }

    private function onBroadcast(ConnectionInterface $from, string $type, array $payload): void {
        $sessionId = $from->sessionId ?? null;
        if (!$sessionId) return;

        $this->broadcastJson($sessionId, [
            'type' => $type,
            'payload' => $payload,
            'role' => $from->role ?? '',
        ], $from);
    }

    private function broadcastJson(string $sessionId, array $data, ?ConnectionInterface $except = null): void {
        $json = json_encode($data);
        $this->connections->broadcast($sessionId, $json, $except);
    }

    public function handleClose(ConnectionInterface $conn): void {
        $sessionId = $conn->sessionId ?? null;
        if ($sessionId) {
            $this->broadcastJson($sessionId, [
                'type' => 'peer_left',
                'payload' => ['role' => $conn->role ?? ''],
            ], $conn);
        }

        
        $this->connections->removeConnection($conn);
    }

    public function handleError(ConnectionInterface $conn, \Exception $e): void {
        $this->connections->removeConnection($conn);
    }
}

?>

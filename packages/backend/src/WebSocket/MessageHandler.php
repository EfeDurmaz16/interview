<?php 

use Ratchet\ConnectionInterface as ConnectionInterface;

class MessageHandler {
    private ConnectionManager $connections;

    public function __construct(ConnectionManager $connections) {
        $this->connections = $connections;
    }

    public function handle(ConnectionInterface $from, string $rawMessage): void {
        $message = json_decode($rawMessage, true);
    }

    public function handleDisconnect(ConnectionInterface $conn): void {
        $this->connections->removeConnection($conn);
    }

    public function handleError(ConnectionInterface $conn, \Exception $e): void {
        $this->connections->removeConnection($conn);
    }

    public function handleOpen(ConnectionInterface $conn, string $sessionId, string $userId, string $role): void {
        $this->connections->addToRoom($sessionId, $role, $conn);
        $this->connections->broadcast($sessionId, 'You joined the session', $conn);
        $this->handleJoinSession($conn, $sessionId, $userId, $role);
    }
    
    public function handleMessage(ConnectionInterface $from, $msg): void {
        $this->handle($from, $msg);
    }

    public function handleClose(ConnectionInterface $conn): void {
        $this->connections->removeConnection($conn);
    }

    public function handleJoinSession(ConnectionInterface $conn, string $sessionId, string $userId, string $role): void {
        $this->connections->addToRoom($sessionId, $role, $conn);
    }

    public function handleCodeChange(ConnectionInterface $conn, string $sessionId, string $userId, string $role, string $code): void {
        $this->connections->broadcast($sessionId, $code, $conn);
    }

    public function handleCursorMove(ConnectionInterface $conn, string $sessionId, string $userId, string $role, int $line, int $column): void {
        $this->connections->broadcast($sessionId, $line . ':' . $column, $conn);
    }
    
    public function handleSetQuestion(ConnectionInterface $conn, string $sessionId, string $userId, string $role, string $question): void {
        $this->connections->broadcast($sessionId, $question, $conn);
    }

    public function handleRunCode(ConnectionInterface $conn, string $sessionId, string $userId, string $role, string $code): void {
        $this->connections->broadcast($sessionId, $code, $conn);
    }
    
    
    public function handleSubmitCode(ConnectionInterface $conn, string $sessionId, string $userId, string $role, string $code, string $questionId): void {
        $this->connections->broadcast($sessionId, $code, $conn);
    }

    public function handleEvaluationUpdate(ConnectionInterface $conn, string $sessionId, string $userId, string $role, string $evaluation): void {
        $this->connections->broadcast($sessionId, $evaluation, $conn);
    }

    public function handleLeaveSession(ConnectionInterface $conn, string $sessionId): void {
        $this->connections->removeConnection($conn);
    }

    public function handlePeerJoined(ConnectionInterface $conn, string $sessionId, string $userId, string $role): void {
        $this->connections->broadcast($sessionId, $userId . ' joined the session', $conn);
    }

    public function handlePeerLeft(ConnectionInterface $conn, string $sessionId, string $userId, string $role): void {
        $this->connections->broadcast($sessionId, $userId . ' left the session', $conn);
    }


}



?>
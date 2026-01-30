<?php

require_once __DIR__ . "/../../vendor/autoload.php";

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Server implements MessageComponentInterface {
    protected $clients;

    public function __construct() {
        $this->clients = new \SplObjectStorage();
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->offsetSet($conn);
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->offsetUnset($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        $conn->close();
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $numRecv = count($this->clients) - 1;
    }

    public function send($msg) {
        foreach ($this->clients as $client) {
            $client->send($msg);
        }
    }

    public function joinSession(ConnectionInterface $conn, $sessionId, $userId, $role) {
        $this->clients->offsetSet($conn, $sessionId, $userId, $role);
    }

    public function leaveSession(ConnectionInterface $conn, $sessionId) {
        $this->clients->offsetUnset($conn, $sessionId);
    }
    
    public function sendCodeChange(ConnectionInterface $conn, $sessionId, $userId, $role, $code) {
        $this->send($conn, $sessionId, $userId, $role, $code);
    }

    public function sendCursorMove(ConnectionInterface $conn, $sessionId, $userId, $role, $cursor) {
        $this->send($conn, $sessionId, $userId, $role, $cursor);
    }
    
    public function sendSetQuestion(ConnectionInterface $conn, $sessionId, $userId, $role, $question) {
        $this->send($conn, $sessionId, $userId, $role, $question);
    }

    public function sendRunCode(ConnectionInterface $conn, $sessionId, $userId, $role, $code) {
        $this->send($conn, $sessionId, $userId, $role, $code);
    }
    
    public function sendCodeOutput(ConnectionInterface $conn, $sessionId, $userId, $role, $output) {
        $this->send($conn, $sessionId, $userId, $role, $output);
    }

    public function sendEvaluationUpdate(ConnectionInterface $conn, $sessionId, $userId, $role, $evaluation) {
        $this->send($conn, $sessionId, $userId, $role, $evaluation);
    }
}

?>
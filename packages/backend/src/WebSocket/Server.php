<?php

require_once __DIR__ . "/../../vendor/autoload.php";
require_once __DIR__ . "/ConnectionManager.php";
require_once __DIR__ . "/MessageHandler.php";
require_once __DIR__ . "/../Models/CodeSnapshot.php";
require_once __DIR__ . "/../Models/Session.php";
require_once __DIR__ . "/../Models/Question.php";
require_once __DIR__ . "/../Services/TokenService.php";
require_once __DIR__ . "/../Services/SessionService.php";
require_once __DIR__ . "/../Services/SessionQuestionService.php";

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

class InterviewWebSocket implements MessageComponentInterface {
    private MessageHandler $handler;

    public function __construct() {
        $tokenService = new TokenService();
        $sessionModel = new Session();
        $sessionService = new SessionService($tokenService, $sessionModel);
        $codeSnapshot = new CodeSnapshot();
        $sessionQuestionService = new SessionQuestionService();

        $this->handler = new MessageHandler(
            new ConnectionManager(),
            $sessionService,
            $codeSnapshot,
            $sessionQuestionService
        );
    }
    
    public function onOpen(ConnectionInterface $conn): void {
        $sessionId = '';
        $userId = '';
        $role = '';

        // Extract session context from WebSocket HTTP handshake query parameters if available.
        if (property_exists($conn, 'httpRequest')) {
            $request = $conn->httpRequest;

            // Ratchet uses Symfony Request; safely read query params when possible.
            if ($request instanceof \Symfony\Component\HttpFoundation\Request) {
                $sessionId = (string) $request->query->get('sessionId', '');
                $userId = (string) $request->query->get('userId', '');
                $role = (string) $request->query->get('role', '');
            }
        }

        $this->handler->handleOpen($conn, $sessionId, $userId, $role);
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $this->handler->handleMessage($from, $msg);
    }
    
    public function onClose(ConnectionInterface $conn) {
        $this->handler->handleClose($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        $this->handler->handleError($conn, $e);
    }


}

?>

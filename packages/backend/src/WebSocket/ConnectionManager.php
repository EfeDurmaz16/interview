<?php

use Ratchet\ConnectionInterface as ConnectionInterface;


class ConnectionManager {
    private array $rooms = [];

    public function addToRoom(string $sessionId, string $role, ConnectionInterface $conn): void {
        $this->rooms[$sessionId][$conn->resourceId] = ['conn' => $conn, 'role' => $role];
    }

    public function removeConnection(ConnectionInterface $conn): ?array {
        foreach ($this->rooms as $sessionId => $connections) {
            foreach ($connections as $connectionId => $connection) {
                if ($connection['conn'] === $conn) {
                    unset($this->rooms[$sessionId][$connectionId]);
                    return ['session_id' => $sessionId, 'role' => $connection['role']];
                }
            }
        }
        return null;
    }

    public function getRoomPeer(string $sessionId, ConnectionInterface $self): ?ConnectionInterface {
        foreach ($this->rooms[$sessionId] as $connectionId => $connection) {
            if ($connection['conn'] !== $self) {
                return $connection['conn'];
            }
        }
        return null;
    }

    public function broadcast(string $sessionId, string $message, ?ConnectionInterface $except = null): void {
        foreach ($this->rooms[$sessionId] as $connectionId => $connection) {
            if ($connection['conn'] !== $except) {
                $connection['conn']->send($message);
            }
        }
    }

    public function isRoomActive(string $sessionId): bool {
        return isset($this->rooms[$sessionId]) && count($this->rooms[$sessionId]) > 0;
    }
}

?>
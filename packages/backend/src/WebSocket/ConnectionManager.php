<?php

use Ratchet\ConnectionInterface as ConnectionInterface;


class ConnectionManager {
    private array $rooms = [];
    private \SplObjectStorage $connectionInfo;

    public function __construct() {
        $this->connectionInfo = new \SplObjectStorage();
    }

    public function addToRoom(string $sessionId, string $role, ConnectionInterface $conn): void {
        $this->rooms[$sessionId][$conn->resourceId] = ['conn' => $conn, 'role' => $role];
        $this->connectionInfo[$conn] = ['session_id' => $sessionId, 'role' => $role];
    }

    public function removeConnection(ConnectionInterface $conn): ?array {
        if ($this->connectionInfo->contains($conn)) {
            $info = $this->connectionInfo[$conn];
            $this->connectionInfo->detach($conn);

            $sessionId = $info['session_id'] ?? null;
            if (is_string($sessionId) && isset($this->rooms[$sessionId][$conn->resourceId])) {
                unset($this->rooms[$sessionId][$conn->resourceId]);
                if (empty($this->rooms[$sessionId])) {
                    unset($this->rooms[$sessionId]);
                }
            } else {
                // Fallback cleanup if room entry doesn't match expected shape
                foreach ($this->rooms as $sid => $connections) {
                    foreach ($connections as $connectionId => $connection) {
                        if ($connection['conn'] === $conn) {
                            unset($this->rooms[$sid][$connectionId]);
                            if (empty($this->rooms[$sid])) unset($this->rooms[$sid]);
                        }
                    }
                }
            }

            return $info;
        }

        foreach ($this->rooms as $sessionId => $connections) {
            foreach ($connections as $connectionId => $connection) {
                if ($connection['conn'] === $conn) {
                    unset($this->rooms[$sessionId][$connectionId]);
                    if (empty($this->rooms[$sessionId])) {
                        unset($this->rooms[$sessionId]);
                    }
                    return ['session_id' => $sessionId, 'role' => $connection['role']];
                }
            }
        }
        return null;
    }

    public function getConnectionInfo(ConnectionInterface $conn): ?array {
        if (!$this->connectionInfo->contains($conn)) return null;
        $info = $this->connectionInfo[$conn];
        return is_array($info) ? $info : null;
    }

    public function getRolesInRoom(string $sessionId): array {
        if (!isset($this->rooms[$sessionId])) return [];
        $roles = [];
        foreach ($this->rooms[$sessionId] as $connection) {
            $roles[] = $connection['role'];
        }
        return array_values(array_unique($roles));
    }

    public function countRoomConnections(string $sessionId): int {
        if (!isset($this->rooms[$sessionId])) return 0;
        return count($this->rooms[$sessionId]);
    }

    public function countConnectionsByRole(string $sessionId, string $role): int {
        if (!isset($this->rooms[$sessionId])) return 0;
        $count = 0;
        foreach ($this->rooms[$sessionId] as $connection) {
            if ($connection['role'] === $role) $count++;
        }
        return $count;
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
        if (!isset($this->rooms[$sessionId])) return;
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

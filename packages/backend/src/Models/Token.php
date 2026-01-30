<?php 
class Token{
    public function insert(string $token, string $sessionId, string $role): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('INSERT INTO tokens (token, session_id, role) VALUES (?, ?, ?)');
        $stmt->execute([$token, $sessionId, $role]);
    }

    public function findByToken(string $token): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM tokens WHERE token = ?');
        $stmt->execute([$token]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function deleteBySessionId(string $sessionId): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM tokens WHERE session_id = ?');
        $stmt->execute([$sessionId]);
    }

    
}

?>
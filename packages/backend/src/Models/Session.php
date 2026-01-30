<?php 
class Session{
    public function create(): string {
        $id = 'ses_' . uniqid();
        $db = Database::getConnection();
        $stmt = $db->prepare('INSERT INTO sessions (id) VALUES (?)');
        $stmt->execute([$id]);
        return $id; 
    }

    public function findById(string $id): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM sessions WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function updateStatus(string $id, string $status): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE sessions SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);
    }

    public function delete(string $id): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM sessions WHERE id = ?');
        $stmt->execute([$id]);
    }
}
?>
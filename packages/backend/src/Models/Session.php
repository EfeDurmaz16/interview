<?php 
class Session{
    public function create(string $candidate_name): string {
        $id = 'ses_' . uniqid();
        $db = Database::getConnection();
        $stmt = $db->prepare('INSERT INTO sessions (id, candidate_name) VALUES (?, ?)');
        $stmt->execute([$id, $candidate_name]);
        return $id; 
    }

    public function findAll(): array {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT * FROM sessions ORDER BY created_at DESC');
        return $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
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

    public function updateStartedAt(string $id, ?string $startedAt): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE sessions SET started_at = ? WHERE id = ?');
        $stmt->execute([$startedAt, $id]);
    }

    public function updateEndedAt(string $id, ?string $endedAt): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE sessions SET ended_at = ? WHERE id = ?');
        $stmt->execute([$endedAt, $id]);
    }
    

}
?>
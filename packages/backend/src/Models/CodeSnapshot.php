<?php

class CodeSnapshot {
    public function create(string $sessionId, string $questionId, string $code, bool $isSubmission): string {
        $id = 'snap_' . uniqid();
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'INSERT INTO code_snapshots (id, session_id, question_id, code, is_submission)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$id, $sessionId, $questionId, $code, $isSubmission ? 1 : 0]);
        return $id;
    }

    public function getBySession(string $sessionId): array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM code_snapshots WHERE session_id = ? ORDER BY created_at DESC');
        $stmt->execute([$sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getBySessionAndQuestion(string $sessionId, string $questionId): array {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'SELECT * FROM code_snapshots WHERE session_id = ? AND question_id = ? ORDER BY created_at DESC'
        );
        $stmt->execute([$sessionId, $questionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

?>


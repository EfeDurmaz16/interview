<?php

class Whiteboard {
    public function create(string $sessionId, string $pngBase64, int $width, int $height): string {
        $id = 'wb_' . uniqid();
        $db = Database::getConnection();
        $stmt = $db->prepare('INSERT INTO whiteboard_snapshots (id, session_id, png_base64, width, height) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$id, $sessionId, $pngBase64, $width, $height]);
        return $id;
    }

    public function getBySession(string $sessionId): array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM whiteboard_snapshots WHERE session_id = ? ORDER BY created_at DESC');
        $stmt->execute([$sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getBySessionAndQuestion(string $sessionId, string $questionId): array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM whiteboard_snapshots WHERE session_id = ? AND question_id = ? ORDER BY created_at DESC');
        $stmt->execute([$sessionId, $questionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>

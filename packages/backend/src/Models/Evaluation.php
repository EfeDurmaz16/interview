<?php

class Evaluation {
    private function evaluationId(string $sessionId, string $questionId): string {
        return 'eval_' . md5($sessionId . '|' . $questionId);
    }

    public function upsert(string $sessionId, string $questionId, string $criteriaScoresJson, string $notes): string {
        $db = Database::getConnection();
        $id = $this->evaluationId($sessionId, $questionId);

        $stmt = $db->prepare(
            'INSERT INTO evaluations (id, session_id, question_id, criteria_scores, notes, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime(\'now\'))
             ON CONFLICT(id) DO UPDATE SET
               criteria_scores = excluded.criteria_scores,
               notes = excluded.notes,
               updated_at = datetime(\'now\')'
        );
        $stmt->execute([$id, $sessionId, $questionId, $criteriaScoresJson, $notes]);
        return $id;
    }

    public function getBySessionAndQuestion(string $sessionId, string $questionId): ?array {
        $db = Database::getConnection();
        $id = $this->evaluationId($sessionId, $questionId);
        $stmt = $db->prepare('SELECT * FROM evaluations WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function getBySession(string $sessionId): array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM evaluations WHERE session_id = ? ORDER BY updated_at DESC');
        $stmt->execute([$sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}


<?php

class Question {
    public function getAllQuestions(): array {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT * FROM questions ORDER BY sort_order ASC, title ASC');
        return $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
    }

    public function getQuestionById(string $id): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM questions WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function getQuestionsBySessionId(string $sessionId): array {
        $db = Database::getConnection();

        // Prefer assignment table, fallback to direct session_id for backwards compatibility.
        $stmt = $db->prepare(
            'SELECT q.* FROM questions q
             INNER JOIN session_questions sq ON sq.question_id = q.id
             WHERE sq.session_id = ?
             ORDER BY sq.sort_order ASC, q.sort_order ASC, q.title ASC'
        );
        $stmt->execute([$sessionId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (is_array($rows) && count($rows) > 0) return $rows;

        $fallback = $db->prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY sort_order ASC, title ASC');
        $fallback->execute([$sessionId]);
        return $fallback->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addToSession(string $sessionId, string $questionId, int $sortOrder): void {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'INSERT OR REPLACE INTO session_questions (session_id, question_id, sort_order)
             VALUES (?, ?, ?)'
        );
        $stmt->execute([$sessionId, $questionId, $sortOrder]);
    }

    public function removeFromSession(string $sessionId, string $questionId): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM session_questions WHERE session_id = ? AND question_id = ?');
        $stmt->execute([$sessionId, $questionId]);
    }

    public function create(array $data): string {
        $id = 'q_' . uniqid();
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'INSERT INTO questions (id, title, description, difficulty, category, template_code, test_cases, evaluation_criteria, sort_order, session_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $data['title'] ?? '',
            $data['description'] ?? '',
            $data['difficulty'] ?? 'easy',
            $data['category'] ?? 'General',
            $data['template_code'] ?? '',
            $data['test_cases'] ?? '[]',
            $data['evaluation_criteria'] ?? '[]',
            $data['sort_order'] ?? 0,
            $data['session_id'] ?? 'bank',
        ]);
        return $id;
    }

    public function update(string $id, array $data): void {
        $db = Database::getConnection();
        $fields = [];
        $values = [];
        $allowed = ['title', 'description', 'difficulty', 'category', 'template_code', 'test_cases', 'evaluation_criteria', 'sort_order'];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                $values[] = $data[$field];
            }
        }
        if (empty($fields)) return;
        $values[] = $id;
        $stmt = $db->prepare('UPDATE questions SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($values);
    }

    public function deleteQuestion(string $id): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM questions WHERE id = ?');
        $stmt->execute([$id]);
    }
}


<?php

class SessionQuestionService {
    public function getOrderedQuestionIds(string $sessionId): array {
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT sq.question_id
             FROM session_questions sq
             INNER JOIN questions q ON q.id = sq.question_id
             WHERE sq.session_id = ?
             ORDER BY sq.sort_order ASC, q.sort_order ASC, q.title ASC'
        );
        $stmt->execute([$sessionId]);

        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $ids = [];

        if (is_array($rows)) {
            foreach ($rows as $id) {
                $id = trim((string) $id);
                if ($id !== '') {
                    $ids[] = $id;
                }
            }
        }

        return $ids;
    }

    public function getPrevQuestionId(string $sessionId, string $currentId): ?string {
        $ids = $this->getOrderedQuestionIds($sessionId);
        $index = array_search($currentId, $ids, true);

        if ($index === false || $index <= 0) {
            return null;
        }

        return $ids[$index - 1];
    }

    public function getNextQuestionId(string $sessionId, string $currentId): ?string {
        $ids = $this->getOrderedQuestionIds($sessionId);
        $index = array_search($currentId, $ids, true);

        if ($index === false || $index >= count($ids) - 1) {
            return null;
        }

        return $ids[$index + 1];
    }
}

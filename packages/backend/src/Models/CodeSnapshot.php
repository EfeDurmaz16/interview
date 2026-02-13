<?php

class CodeSnapshot {
    public function create(string $sessionId, string $questionId, string $code, bool $isSubmission, ?string $whiteboardSnapshot = null): string {
        $id = 'snap_' . uniqid();
        $db = Database::getConnection();

        if ($sessionId === '' || $questionId === '') {
            throw new InvalidArgumentException('sessionId and questionId are required');
        }
        if (!is_string($code)) {
            throw new InvalidArgumentException('Code must be a string');
        }

        if ($whiteboardSnapshot !== null && !is_string($whiteboardSnapshot)) {
            throw new InvalidArgumentException('Whiteboard snapshot must be a string if provided');
        }

        $stmt = $db->prepare(
            'INSERT INTO code_snapshots (id, session_id, question_id, code, is_submission, whiteboard_snapshot) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$id, $sessionId, $questionId, $code, $isSubmission ? 1 : 0, $whiteboardSnapshot]);
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
    public function createProject(string $sessionId, string $questionId, array $files, bool $isSubmission, ?string $entryFile = null, ?string $activeFile = null): string {
        $id = 'snap_' . uniqid();
        $db = Database::getConnection();

        if ($sessionId === '' || $questionId === '') {
          throw new InvalidArgumentException('sessionId and questionId are required');
        }

        if (count($files) === 0) {
            throw new InvalidArgumentException('At least one file is required');
        }

        if (count($files) > 10) {
            throw new InvalidArgumentException('Maximum 10 files allowed');
        }

        $totalBytes = 0;
        $validated = [];

        foreach ($files as $name => $content) {
            $name = (string) $name;
            if (!preg_match('/^[A-Za-z0-9_]+\.php$/', $name)) {
                throw new InvalidArgumentException("Invalid file name: {$name}");
            }

            if (!is_string($content)) {
                throw new InvalidArgumentException("File content must be a string for file: {$name}");
            }

            $totalBytes += strlen($content);
            $validated[$name] = $content;
        }

        if ($totalBytes > 200 * 1024) {
            throw new InvalidArgumentException('Total file size exceeds 200KB');
        }

        // önce file.php düzenlenecek
        // hem code_snapshots tablosuna hem de files tablosuna kayıt atılacak galiba
        foreach ($validated as $name => $content) {
            $fileModel = new File();
            $fileId = $fileModel->getOrCreateId($sessionId, $questionId, $name);
            $stmt = $db->prepare(
                'INSERT INTO code_snapshots (id, session_id, question_id, file_id, code, is_submission) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$id . '_' . $name, $sessionId, $questionId, $fileId, $content, $isSubmission ? 1 : 0]);
        }

        $stmt = $db->prepare('INSERT INTO code_snapshots (id, session_id, question_id, is_submission) VALUES (?, ?, ?, ?)');
        $stmt->execute([$id, $sessionId, $questionId, $isSubmission ? 1 : 0]);
        return $id;
    }
}

?>


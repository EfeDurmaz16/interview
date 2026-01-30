<?php
    class CodeSnapshots {
        public function create(string $sessionId, string $questionId, string $code, boolean $isSubmitted) {
            $db->query("INSERT INTO code_snapshots (session_id, question_id, code, is_submitted, created_at) VALUES (:session_id, :question_id, :code_content, :is_submitted, NOW())");
            $db->bind(":session_id", $sessionId);
            $db->bind(":question_id", $questionId);
            $db->bind(":code", $code);
            $db->bind(":is_submitted", $isSubmitted);
            $db->execute();
        }

        public function getBySession(string $sessionId) {
            $db->query("SELECT * FROM code_snapshots WHERE session_id = :session_id ORDER BY created_at DESC");
            $db->bind(":session_id", $sessionId);
            $snapshots = $db->fetchAll();
            return $snapshots;
        }

        public function getBySessionAndQuestion(string $sessionId, string $questionId) {
            $db->query("SELECT * FROM code_snapshots WHERE session_id = :session_id AND question_id = :question_id ORDER BY created_at DESC");
            $db->bind(":session_id", $sessionId);
            $db->bind(":question_id", $questionId);
            $snapshots = $db->fetchAll();
            return $snapshots;
        }
    }
?>
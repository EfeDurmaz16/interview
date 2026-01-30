<?php
    class Evaluations { 
        public function upsert(string $sessionId, string $questionId, string $criteriaScoreJson, string $notes) {
            $db->query("INSERT INTO evaluations (session_id, question_id, criteria_score, notes) VALUES (:session_id, :question_id, :criteria_score, :notes) ON DUPLICATE KEY UPDATE criteria_score = :criteria_score, notes = :notes");
            $db->bind(":session_id", $sessionId);
            $db->bind(":question_id", $questionId);
            $db->bind(":criteria_score", $criteriaScoreJson);
            $db->bind(":notes", $notes);
            $db->execute();
        }

        public function getBySessionAndQuestion(string $sessionId, string $questionId) {
            $db->query("SELECT * FROM evaluations WHERE session_id = :session_id AND question_id = :question_id");
            $db->bind(":session_id", $sessionId);
            $db->bind(":question_id", $questionId);
            $evaluation = $db->fetch();
            return $evaluation;
        }

        public function getBySession(string $sessionId) {
            $db->query("SELECT * FROM evaluations WHERE session_id = :session_id");
            $db->bind(":session_id", $sessionId);
            $evaluations = $db->fetchAll();
            return $evaluations;
        }  
    }
?>
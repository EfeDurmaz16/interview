<?php   
    $db = Database::getConnection();
    class Question {
    public function getAllQuestions() {
        global $db;

        $db -> query("SELECT * FROM questions");
        $questions = $db -> fetchAll();
        return $questions;
    }

    public function getQuestionById($id) {
        global $db;

        $db -> query("SELECT * FROM questions WHERE id = :id");
        $db -> bind(":id", $id);
        $question = $db -> fetch();
        return $question;
    }

    public function getQuestionsBySessionId(string $sessionId) {
        global $db;

        $db->query("SELECT * FROM questions WHERE session_id = :session_id");
        $db->bind(":session_id", $sessionId);
        $questions = $db->fetchAll();
        return $questions;
    }

    public function addToSession(string $sessionId, string $questionId, int $sortOrder) {
        global $db;

        $db->query("INSERT INTO questions_sessions (session_id, question_id, sort_order) VALUES (:session_id, :question_id, :sort_order)");
        $db->bind(":session_id", $sessionId);
        $db->bind(":question_id", $questionId);
        $db->bind(":sort_order", $sortOrder);
        $db->execute();
    }

    public function removeFromSession(string $sessionId, string $questionId) {
        global $db;

        $db->query("DELETE FROM questions_sessions WHERE session_id = :session_id AND question_id = :question_id");
        $db->bind(":session_id", $sessionId);
        $db->bind(":question_id", $questionId);
        $db->execute();
    }
    
}

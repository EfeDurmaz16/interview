<?php
    class QuestionService{

        private Question $question;

        public function __construct(){
            $this-> question = new Question();
        }

        public function getBank(){

            $allQuestions = $this->question->getAllQuestions();
            return $allQuestions;
        }

        public function getSessionQuestions(string $sessionId) {
            $sessionQuestions = $this->question->getQuestionsBySessionId($sessionId);
            return $sessionQuestions;
        }
        
        public function assignQuestionToSession(string $sessionId, string $questionId) {
            $this->question->addToSession($sessionId, $questionId, 0);
        }

        public function removeQuestionFromSession(string $sessionId, string $questionId) {
            $this->question->removeFromSession($sessionId,$questionId);
        }

        public function createQuestion(array $data): array {
            $id = $this->question->create($data);
            return $this->question->getQuestionById($id);
        }

        public function updateQuestion(string $id, array $data): ?array {
            $existing = $this->question->getQuestionById($id);
            if (!$existing) return null;
            $this->question->update($id, $data);
            return $this->question->getQuestionById($id);
        }

        public function deleteQuestion(string $id): bool {
            $existing = $this->question->getQuestionById($id);
            if (!$existing) return false;
            $this->question->deleteQuestion($id);
            return true;
        }

        public function replaceSessionQuestions(string $sessionId, array $questionIds): void {
            $db = Database::getConnection();
            // Delete all existing assignments
            $del = $db->prepare('DELETE FROM session_questions WHERE session_id = ?');
            $del->execute([$sessionId]);
            // Insert new assignments in order
            $ins = $db->prepare('INSERT INTO session_questions (session_id, question_id, sort_order) VALUES (?, ?, ?)');
            foreach ($questionIds as $i => $qid) {
                $ins->execute([$sessionId, $qid, $i]);
            }
        }

    }
?>
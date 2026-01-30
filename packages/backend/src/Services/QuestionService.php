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
            $sessionQuestions = $this->question->getBySessionId($sessionId);
            return $sessionQuestions;
        }
        
        public function assignQuestionsToSession(string $sessionId, string $questionId) {
            $this->question->addToSession($sessionId,$questionId);
        }

        public function removeQuestionsFromSession(string $sessionId, string $questionId) {
            $this->question->removeFromSession($sessionId,$questionId);
        }

    }
?>
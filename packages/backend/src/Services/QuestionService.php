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

    }
?>
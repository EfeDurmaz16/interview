<?php
    class EvaluationService{

        private Evaluation $evaluation;

        public function __construct(){
            $this->evaluation = new Evaluation();
        }

        public function saveEvaluation(string $sessionId, string $questionId, array $criteriaScores, string $notes){
            $this->evaluation->upsert($sessionId,$questionId,$criteriaScores,$notes);
        }

        public function getSessionEvaluations(string $sessionId){
            $sessionEvaluations = $this->evaluation->getBySession($sessionId);
            return $sessionEvaluations;
        }

    }
?>
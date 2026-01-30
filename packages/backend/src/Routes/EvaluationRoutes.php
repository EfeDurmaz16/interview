<?php

class EvaluationRoutes {
    public static function register(Router $router): void {
        $evaluationService = new EvaluationService();

        $router->put('/api/sessions/:sid/questions/:qid/evaluation', function ($params, $body) use ($evaluationService) {
            $evaluationService->saveEvaluation(
                $params['sid'],
                $params['qid'],
                $body['criteria_scores'] ?? [],
                $body['notes'] ?? ''
            );
            json(['success' => true]);
        });

        $router->get('/api/sessions/:id/evaluations', function ($params, $body) use ($evaluationService) {
            json($evaluationService->getSessionEvaluations($params['id']));
        });
    }
}

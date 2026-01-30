<?php

class QuestionRoutes {
    public static function register(Router $router): void {
        $questionService = new QuestionService();

        $router->get('/api/questions/bank', function ($params, $body) use ($questionService) {
            json($questionService->getBank());
        });

        $router->get('/api/sessions/:id/questions', function ($params, $body) use ($questionService) {
            json($questionService->getSessionQuestions($params['id']));
        });

        $router->post('/api/sessions/:id/questions', function ($params, $body) use ($questionService) {
            $questionService->assignQuestionToSession($params['id'], $body['question_id']);
            json(['success' => true], 201);
        });

        $router->delete('/api/sessions/:id/questions/:qid', function ($params, $body) use ($questionService) {
            $questionService->removeQuestionFromSession($params['id'], $params['qid']);
            http_response_code(204);
        });
    }
}

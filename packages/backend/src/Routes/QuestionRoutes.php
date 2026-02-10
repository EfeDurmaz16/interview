<?php

class QuestionRoutes {
    public static function register(Router $router): void {
        $questionService = new QuestionService();
        $authService = new AuthService(new TokenService());
        $settings = new Settings();

        $router->get('/api/questions/bank', function ($params, $body) use ($questionService, $authService, $settings) {
            $resolved = $authService->resolveSessionRoleFromBearer();
            $token = $authService->getBearerToken();

            if ($resolved !== null && !empty($resolved['role'])) {
                $role = (string) $resolved['role'];
                if ($role === 'candidate') {
                    json(['error' => 'Forbidden'], 403);
                    return;
                }

                if ($role === 'interviewer') {
                    json($questionService->getBank());
                    return;
                }
            }

            if ($token !== null) {
                $hash = hash('sha256', $token);
                $stored = $settings->get('admin_token_' . $hash);
                if ($stored) {
                    json($questionService->getBank());
                    return;
                }

                json(['error' => 'Forbidden'], 403);
                return;
            }

            // No bearer token: allow admin panel access (treated as interviewer-level read).
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

        // Batch replace session questions
        $router->put('/api/sessions/:id/questions', function ($params, $body) use ($questionService) {
            $questionIds = $body['question_ids'] ?? [];

            if (!is_array($questionIds)) {
                json(['error' => 'question_ids must be an array'], 400);
                return;
            }

            $questionService->replaceSessionQuestions($params['id'], $questionIds);
            json(['success' => true]);
        });
    }
}

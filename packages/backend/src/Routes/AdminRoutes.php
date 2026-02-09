<?php

class AdminRoutes {
    public static function register(Router $router): void {
        $questionService = new QuestionService();
        $sessionModel = new Session();
        $tokenService = new TokenService();
        $sessionService = new SessionService($tokenService, $sessionModel);

        // --- Question CRUD ---

        // Create question
        $router->post('/api/admin/questions', function ($params, $body) use ($questionService) {
            $result = $questionService->createQuestion($body);
            json($result, 201);
        });

        // Update question
        $router->put('/api/admin/questions/:id', function ($params, $body) use ($questionService) {
            $result = $questionService->updateQuestion($params['id'], $body);
            if ($result === null) {
                json(['error' => 'Question not found'], 404);
                return;
            }
            json($result);
        });

        // Delete question
        $router->delete('/api/admin/questions/:id', function ($params, $body) use ($questionService) {
            $deleted = $questionService->deleteQuestion($params['id']);
            if (!$deleted) {
                json(['error' => 'Question not found'], 404);
                return;
            }
            json(['success' => true]);
        });

        // --- Session Listing ---

        // List all sessions
        $router->get('/api/admin/sessions', function ($params, $body) use ($sessionModel) {
            $sessions = $sessionModel->findAll();
            json($sessions);
        });

        // --- Create session (superadmin) ---

        $router->post('/api/admin/sessions', function ($params, $body) use ($sessionService) {
            $result = $sessionService->createSession($body['candidate_name'] ?? null);
            json($result, 201);
        });
    }
}

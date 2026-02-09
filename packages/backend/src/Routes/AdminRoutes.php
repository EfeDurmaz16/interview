<?php

class AdminRoutes {
    public static function register(Router $router): void {
        $questionService = new QuestionService();
        $sessionModel = new Session();
        $tokenService = new TokenService();
        $sessionService = new SessionService($tokenService, $sessionModel);
        $settings = new Settings();

        // --- Auth ---

        $requireAuth = function () use ($settings): bool {
            $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if (!str_starts_with($header, 'Bearer ')) {
                json(['error' => 'Unauthorized'], 401);
                return false;
            }
            $token = substr($header, 7);
            $hash = hash('sha256', $token);
            $stored = $settings->get('admin_token_' . $hash);
            if (!$stored) {
                json(['error' => 'Unauthorized'], 401);
                return false;
            }
            return true;
        };

        // Login
        $router->post('/api/admin/auth', function ($params, $body) use ($settings) {
            $password = $body['password'] ?? '';
            $storedHash = $settings->get('superadmin_password');
            if (!$storedHash || !password_verify($password, $storedHash)) {
                json(['error' => 'Invalid password'], 401);
                return;
            }
            $token = bin2hex(random_bytes(32));
            $hash = hash('sha256', $token);
            $settings->set('admin_token_' . $hash, date('c'));
            json(['token' => $token]);
        });

        // --- Question CRUD (protected) ---

        // Create question
        $router->post('/api/admin/questions', function ($params, $body) use ($questionService, $requireAuth) {
            if (!$requireAuth()) return;
            $result = $questionService->createQuestion($body);
            json($result, 201);
        });

        // Update question
        $router->put('/api/admin/questions/:id', function ($params, $body) use ($questionService, $requireAuth) {
            if (!$requireAuth()) return;
            $result = $questionService->updateQuestion($params['id'], $body);
            if ($result === null) {
                json(['error' => 'Question not found'], 404);
                return;
            }
            json($result);
        });

        // Delete question
        $router->delete('/api/admin/questions/:id', function ($params, $body) use ($questionService, $requireAuth) {
            if (!$requireAuth()) return;
            $deleted = $questionService->deleteQuestion($params['id']);
            if (!$deleted) {
                json(['error' => 'Question not found'], 404);
                return;
            }
            json(['success' => true]);
        });

        // --- Session Listing (protected) ---

        $router->get('/api/admin/sessions', function ($params, $body) use ($sessionModel, $requireAuth) {
            if (!$requireAuth()) return;
            $sessions = $sessionModel->findAll();
            json($sessions);
        });

        // --- Create session (protected) ---

        $router->post('/api/admin/sessions', function ($params, $body) use ($sessionService, $requireAuth) {
            if (!$requireAuth()) return;
            $result = $sessionService->createSession($body['candidate_name'] ?? null);
            json($result, 201);
        });

        // --- Delete session (protected) ---

        $router->delete('/api/admin/sessions/:id', function ($params, $body) use ($sessionModel, $requireAuth) {
            if (!$requireAuth()) return;
            $session = $sessionModel->findById($params['id']);
            if (!$session) {
                json(['error' => 'Session not found'], 404);
                return;
            }
            $sessionModel->delete($params['id']);
            json(['success' => true]);
        });
    }
}

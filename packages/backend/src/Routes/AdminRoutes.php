<?php

class AdminRoutes {
    public static function register(Router $router): void {
        $questionService = new QuestionService();
        $sessionModel = new Session();
        $tokenService = new TokenService();
        $authService = new AuthService($tokenService);
        $sessionService = new SessionService($tokenService, $sessionModel);
        $settings = new Settings();

        // --- Auth ---

        $resolveRole = function () use ($authService, $settings): ?string {
            $resolved = $authService->resolveSessionRoleFromBearer();
            if ($resolved !== null && !empty($resolved['role'])) {
                return (string) $resolved['role'];
            }

            $token = $authService->getBearerToken();
            if ($token === null) {
                // No bearer token on admin panel requests: treat as interviewer.
                return 'interviewer';
            }

            $hash = hash('sha256', $token);
            $stored = $settings->get('admin_token_' . $hash);
            if ($stored) {
                return 'superadmin';
            }

            return null;
        };

        $requireInterviewerOrSuperadmin = function () use ($resolveRole): bool {
            $role = $resolveRole();
            if ($role !== 'interviewer' && $role !== 'superadmin') {
                json(['error' => 'Forbidden'], 403);
                return false;
            }
            return true;
        };

        $requireSuperadmin = function () use ($resolveRole): bool {
            if ($resolveRole() !== 'superadmin') {
                json(['error' => 'Forbidden'], 403);
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

        // Create question (interviewer + superadmin)
        $router->post('/api/admin/questions', function ($params, $body) use ($questionService, $requireInterviewerOrSuperadmin) {
            if (!$requireInterviewerOrSuperadmin()) return;
            $result = $questionService->createQuestion($body);
            json($result, 201);
        });

        // Update question (superadmin only for now)
        $router->put('/api/admin/questions/:id', function ($params, $body) use ($questionService, $requireSuperadmin) {
            if (!$requireSuperadmin()) return;
            $result = $questionService->updateQuestion($params['id'], $body);
            if ($result === null) {
                json(['error' => 'Question not found'], 404);
                return;
            }
            json($result);
        });

        // Delete question
        $router->delete('/api/admin/questions/:id', function ($params, $body) use ($questionService, $requireSuperadmin) {
            if (!$requireSuperadmin()) return;
            $deleted = $questionService->deleteQuestion($params['id']);
            if (!$deleted) {
                json(['error' => 'Question not found'], 404);
                return;
            }
            json(['success' => true]);
        });

        // --- Session Listing (interviewer + superadmin) ---

        $router->get('/api/admin/sessions', function ($params, $body) use ($sessionModel, $requireInterviewerOrSuperadmin) {
            if (!$requireInterviewerOrSuperadmin()) return;
            $sessions = $sessionModel->findAll();
            json($sessions);
        });

        // --- Create session (superadmin only) ---

        $router->post('/api/admin/sessions', function ($params, $body) use ($sessionService, $requireSuperadmin) {
            if (!$requireSuperadmin()) return;
            $candidateName = trim($body['candidate_name'] ?? '') ?? null;
            if($candidateName === '' || mb_strlen($candidateName) > 120) return;
            $result = $sessionService->createSession($candidateName);
            json($result, 201);
        });

        // --- Delete session (superadmin only) ---

        $router->delete('/api/admin/sessions/:id', function ($params, $body) use ($sessionModel, $requireSuperadmin) {
            if (!$requireSuperadmin()) return;
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

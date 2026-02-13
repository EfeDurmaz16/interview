<?php
class SessionRoutes {
    public static function register(Router $router): void {
        $tokenService = new TokenService();
        $sessionModel = new Session();
        $sessionService = new SessionService($tokenService, $sessionModel);
        
        $router->post('/api/sessions', function ($params, $body) use ($sessionService) {
            $result = $sessionService->createSession($body['candidate_name'] ?? null);
            json($result, 201);
        });

        $router->get('/api/resolve/:token', function ($params, $body) use ($sessionService) {
            $result = $sessionService->resolveToken($params['token']);
            if ($result === null) {
                json(['error' => 'Not found'], 404);
                return;
            }
            json($result);
        });

        $router->get('/api/sessions/:id', function ($params, $body) use ($sessionService) {
            $result = $sessionService->getSession($params['id']);
            if ($result === null) {
                json(['error' => 'Not found'], 404);
                return;
            }
            json(array_merge($result, [
                'server_now' => gmdate('c'),
            ]));
        });

        $router->patch('/api/sessions/:id', function ($params, $body) use ($sessionService) {
            $action = $body['action'] ?? '';
            if ($action === 'start') {
                $sessionService->startSession($params['id']);
            } elseif ($action === 'end') {
                $sessionService->endSession($params['id']);
            } else {
                json(['error' => 'Invalid action'], 400);
                return;
            }
            $session = $sessionService->getSession($params['id']);
            json([
                'success' => true,
                'server_now' => gmdate('c'),
                'session' => $session,
            ]);
        });

        $router->get('/api/sessions/:id/report', function ($params, $body) {
            $reportService = new ReportService();
            $result = $reportService->generate($params['id']);
            json($result ?? []);
        });
    }
}

<?php 

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/Routes/Router.php';
require __DIR__ . '/../src/Services/SessionService.php';



$tokenService = new TokenService();
$sessionService = new SessionService($tokenService, new Session());

$router = new Router();

$router->get('/api/sessions', function($params, $body) use ($sessionService) {
    global $sessionService;
    return $sessionService->createSession($body['candidate_name'] ?? null);
});

$router->get('/api/resolve/:token', function($params, $body) {
    global $sessionService;
    return $sessionService->resolveToken($params['token']);
});

$router->get('/api/sessions/:id', function($params, $body) {
    global $sessionService;
    return $sessionService->getSession($params['id']);
});

$router->patch('/api/sessions/:id', function($params, $body) {
    global $sessionService;
    return $sessionService->startSession($params['id']);
});

$router->patch('/api/sessions/:id', function($params, $body) {
    global $sessionService;
    return $sessionService->endSession($params['id']);
});


?>
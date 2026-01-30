<?php

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/Config/Database.php';
require __DIR__ . '/../src/Models/Session.php';
require __DIR__ . '/../src/Models/Token.php';
require __DIR__ . '/../src/Models/Question.php';
require __DIR__ . '/../src/Models/Evaluation.php';
require __DIR__ . '/../src/Models/CodeSnapshot.php';
require __DIR__ . '/../src/Services/TokenService.php';
require __DIR__ . '/../src/Services/SessionService.php';
require __DIR__ . '/../src/Services/QuestionService.php';
require __DIR__ . '/../src/Services/EvaluationService.php';
require __DIR__ . '/../src/Services/ReportService.php';
require __DIR__ . '/../src/Routes/Router.php';
require __DIR__ . '/../src/Routes/SessionRoutes.php';
require __DIR__ . '/../src/Routes/QuestionRoutes.php';
require __DIR__ . '/../src/Routes/EvaluationRoutes.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

Database::init();

$router = new Router();
SessionRoutes::register($router);
QuestionRoutes::register($router);
EvaluationRoutes::register($router);

$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);

<?php 

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/Config/Database.php';
require __DIR__ . '/../src/WebSocket/Server.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use React\Socket\ServerInterface;

Database::init();

$server = new IoServer(
    new HttpServer(
        new WsServer(new InterviewWebSocket())
    ),
    new ServerInterface('0.0.0.0', 8080)
);

echo "WebSocket server running on ws://0.0.0.0:8080\n";
$server->run();

?>
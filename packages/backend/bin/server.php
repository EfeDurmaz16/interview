<?php 

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/Config/Database.php';
require __DIR__ . '/../src/Models/Token.php';
require __DIR__ . '/../src/Services/TokenService.php';
require __DIR__ . '/../src/WebSocket/Server.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use React\Socket\Server as ReactServer;
use React\EventLoop\Factory as LoopFactory;

Database::init();

$loop = LoopFactory::create();
$port = getenv('WS_PORT') ?: '8080';
$socket = new ReactServer('127.0.0.1:' . $port, $loop);

$server = new IoServer(
    new HttpServer(
        new WsServer(new InterviewWebSocket()),
        16384
    ),
    $socket,
    $loop
);

echo "WebSocket server running on ws://127.0.0.1:" . $port . "\n";
$server->run();

?>

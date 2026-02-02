<?php 

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/Config/Database.php';
require __DIR__ . '/../src/WebSocket/Server.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use React\Socket\Server as ReactServer;
use React\EventLoop\Factory as LoopFactory;

Database::init();

$loop = LoopFactory::create();
$socket = new ReactServer('0.0.0.0:8080', $loop);

$server = new IoServer(
    new HttpServer(
        new WsServer(new InterviewWebSocket()),
        16384
    ),
    $socket,
    $loop
);

echo "WebSocket server running on ws://0.0.0.0:8080\n";
$server->run();

?>
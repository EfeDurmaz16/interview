<?php 

class Router {
    private array $routes = [];

    public function get(string $path, callable $handler): void {
        $this->routes['GET'][$path] = $handler;
    }

    public function post(string $path, callable $handler): void {
        $this->routes['POST'][$path] = $handler;
    }

    public function put(string $path, callable $handler): void {
        $this->routes['PUT'][$path] = $handler;
    }

    public function patch(string $path, callable $handler): void {
        $this->routes['PATCH'][$path] = $handler;
    }

    public function delete(string $path, callable $handler): void {
        $this->routes['DELETE'][$path] = $handler;
    }

    public function dispatch(string $method, string $uri): void {
        $path = parse_url($uri, PHP_URL_PATH);
        $path = str_replace('//', '/', $path);
        $path = trim($path, '/');
        $path = explode('/', $path);
        $path = array_filter($path, fn($p) => $p !== '');
        $path = implode('/', $path);
    }

    
}

?>
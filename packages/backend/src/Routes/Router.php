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
        $path = rtrim($path, '/');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (!isset($this->routes[$method])) {
            json(['error' => 'Not found'], 404);
            return;
        }

        foreach ($this->routes[$method] as $route => $handler) {
            $params = $this->match($route, $path);
            if ($params !== false) {
                $handler($params, $body);
                return;
            }
        }

        json(['error' => 'Not found'], 404);
    }

    private function match(string $route, string $path): array|false {
        $routeParts = explode('/', trim($route, '/'));
        $pathParts = explode('/', trim($path, '/'));

        if (count($routeParts) !== count($pathParts)) {
            return false;
        }

        $params = [];
        for ($i = 0; $i < count($routeParts); $i++) {
            if (str_starts_with($routeParts[$i], ':')) {
                $params[substr($routeParts[$i], 1)] = $pathParts[$i];
            } elseif ($routeParts[$i] !== $pathParts[$i]) {
                return false;
            }
        }

        return $params;
    }
}

function json(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
}
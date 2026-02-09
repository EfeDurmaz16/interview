<?php

class AuthService {
    private TokenService $tokenService;

    public function __construct(TokenService $tokenService) {
        $this->tokenService = $tokenService;
    }

    private function getHeader(string $name): ?string {
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $key => $value) {
                    if (strcasecmp((string) $key, $name) === 0) {
                        $normalized = trim((string) $value);
                        return $normalized !== '' ? $normalized : null;
                    }
                }
            }
        }

        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (!empty($_SERVER[$serverKey])) {
            $normalized = trim((string) $_SERVER[$serverKey]);
            return $normalized !== '' ? $normalized : null;
        }

        if (strcasecmp($name, 'Authorization') === 0 && !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $normalized = trim((string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
            return $normalized !== '' ? $normalized : null;
        }

        return null;
    }

    public function getBearerToken(): ?string {
        $authorization = $this->getHeader('Authorization');
        if ($authorization === null) {
            return null;
        }

        if (!preg_match('/^\s*Bearer\s+(.+?)\s*$/i', $authorization, $matches)) {
            return null;
        }

        $token = trim($matches[1]);
        return $token !== '' ? $token : null;
    }

    public function resolveSessionRoleFromBearer(): ?array {
        $token = $this->getBearerToken();
        if ($token === null) {
            return null;
        }

        $resolved = $this->tokenService->resolveToken($token);
        if (!$resolved || empty($resolved['session_id']) || empty($resolved['role'])) {
            return null;
        }

        return [
            'session_id' => (string) $resolved['session_id'],
            'role' => (string) $resolved['role'],
            'user_id' => hash('sha256', $token),
        ];
    }

    public function requireRoles(?array $resolved, array $allowedRoles): void {
        if ($resolved === null || empty($resolved['role'])) {
            json(['error' => 'Forbidden'], 403);
            exit;
        }

        $role = (string) $resolved['role'];
        if (!in_array($role, $allowedRoles, true)) {
            json(['error' => 'Forbidden'], 403);
            exit;
        }
    }

    public function requireAdmin(): void {
        $expected = getenv('ADMIN_KEY') ?: '';
        $provided = $this->getHeader('X-Admin-Key') ?? '';

        if ($expected === '' || !hash_equals($expected, $provided)) {
            json(['error' => 'Forbidden'], 403);
            exit;
        }
    }
}

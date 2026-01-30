<?php

class TokenService {
    public static function generateToken(string $prefix): string {
        return $prefix . '_' . bin2hex(random_bytes(16));
    }

    public function createSessionTokens(string $sessionId): array {
        $interviewerToken = $this->generateToken('int');
        $candidateToken = $this->generateToken('cnd');
        $tokens = [
            'interviewer_token' => $interviewerToken,
            'candidate_token' => $candidateToken
        ];
        return $tokens;
    }

    public function resolveToken(string $token): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM tokens WHERE token = ?');
        $stmt->execute([$token]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function invalidateSessionTokens(string $sessionId): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM tokens WHERE session_id = ?');
        $stmt->execute([$sessionId]);
    }
}

?>
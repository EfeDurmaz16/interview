<?php

class TokenService{
    public static function generateToken(string $prefix): string {
        return $prefix . '_' . bin2hex(random_bytes(16));
    }

    public function createSessionTokens(string $sessionId): array {
        $interviewerToken = $this->generateToken('int');
        $candidateToken = $this->generateToken('cnd');

        $tokenModel = new Token();
        $tokenModel->insert($interviewerToken, $sessionId, 'interviewer');
        $tokenModel->insert($candidateToken, $sessionId, 'candidate');

        return [
            'interviewer_token' => $interviewerToken,
            'candidate_token' => $candidateToken
        ];
    }

    public function resolveToken(string $token): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM tokens WHERE token = ?');
        $stmt->execute([$token]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$result) return null;

        // Include the other role's token for sharing
        $stmt2 = $db->prepare('SELECT token, role FROM tokens WHERE session_id = ? AND token != ?');
        $stmt2->execute([$result['session_id'], $token]);
        $other = $stmt2->fetch(PDO::FETCH_ASSOC);
        if ($other) {
            $result['other_token'] = $other['token'];
            $result['other_role'] = $other['role'];
        }
        return $result;
    }

    public function invalidateSessionTokens(string $sessionId): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM tokens WHERE session_id = ?');
        $stmt->execute([$sessionId]);
    }
}

?>
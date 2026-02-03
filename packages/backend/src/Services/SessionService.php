<?php 
class SessionService{

    private TokenService $tokenService;
    private Session $sessionModel;

    public function __construct(TokenService $tokenService, Session $sessionModel) {
        $this->tokenService = $tokenService;
        $this->sessionModel = $sessionModel;
    }

    /**
     * @param string|null $candidateName
     * @return array
     */
    public function createSession(?string $candidateName): array {
        $sessionId = $this->sessionModel->create();
        $tokens = $this->tokenService->createSessionTokens($sessionId);
        return [
            'session_id' => $sessionId,
            'interviewer_token' => $tokens['interviewer_token'],
            'candidate_token' => $tokens['candidate_token'],
            'interviewer_url' => "http://localhost:8000/interview/{$tokens['interviewer_token']}",
            'candidate_url' => "http://localhost:8000/interview/{$tokens['candidate_token']}"
        ];
    }

     public function resolveToken(string $token): ?array {
        return $this->tokenService->resolveToken($token);
    }

    public function startSession(string $sessionId,): void {
        $this->sessionModel->updateStatus($sessionId, 'active');

        $session = $this->sessionModel->findById($sessionId);
        if ($session && !$session['started_at']) {
            $this->sessionModel->updateStartedAt($sessionId, gmdate('c'));
        }
    }
    
    
    public function endSession(string $sessionId): void {
        $this->sessionModel->updateStatus($sessionId, 'ended');

        $session = $this->sessionModel->findById($sessionId);
        if ($session && !$session['ended_at']) {
            $this->sessionModel->updateEndedAt($sessionId, gmdate('c'));
        }
        
    }

    public function getSession(string $sessionId): ?array {
        return $this->sessionModel->findById($sessionId);
    }
}


?>
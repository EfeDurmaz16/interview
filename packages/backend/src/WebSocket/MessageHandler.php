<?php

use Ratchet\ConnectionInterface as ConnectionInterface;

class MessageHandler {
    private ConnectionManager $connections;
    private TokenService $tokenService;
    private SessionService $sessionService;
    private CodeSnapshot $codeSnapshot;
    private Question $questionModel;
    private SessionQuestionService $sessionQuestionService;
    private array $sessionNavPermission = [];
    private array $sessionInterviewerQuestionId = [];
    private array $sessionCandidateQuestionId = [];

    public function __construct(
        ConnectionManager $connections,
        SessionService $sessionService,
        CodeSnapshot $codeSnapshot,
        SessionQuestionService $sessionQuestionService
    ) {
        $this->connections = $connections;
        $this->tokenService = new TokenService();
        $this->sessionService = $sessionService;
        $this->codeSnapshot = $codeSnapshot;
        $this->questionModel = new Question();
        $this->sessionQuestionService = $sessionQuestionService;
    }

    public function handleOpen(ConnectionInterface $conn, string $sessionId, string $userId, string $role): void {
        // Session info will be set on JOIN_SESSION message
    }

    public function handleMessage(ConnectionInterface $from, $msg): void {
        $message = json_decode($msg, true);
        if (!$message || !isset($message['type'])) return;

        $type = $message['type'];
        $payload = $message['payload'] ?? [];

        switch ($type) {
            case 'join_session':
                $this->onJoinSession($from, $payload);
                break;
            case 'code_change':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'cursor_move':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'run_code':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'code_output':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'set_question':
                $this->onSetQuestion($from, $payload);
                break;
            case 'navigate_question':
                $this->handleNavigateQuestion($from, $payload);
                break;
            case 'submit_code':
                $this->onSubmitCode($from, $payload);
                break;
            case 'session_started':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'session_ended':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'evaluation_update':
                $this->onBroadcast($from, $type, $payload);
                break;
            case 'whiteboard_snapshot':
                $this->onBroadcast($from, $type, $payload);
                break;
            default:
                break;
        }
    }

    private function onJoinSession(ConnectionInterface $conn, array $payload): void {
        $token = $payload['token'] ?? '';
        if (!$token) return;

        $resolved = $this->tokenService->resolveToken($token);
        if (!$resolved) return;

        $sessionId = $resolved['session_id'];
        $role = $resolved['role'];

        $this->connections->addToRoom($sessionId, $role, $conn);

        // Send current room state to the newly joined peer (for refresh/late-join scenarios)
        $conn->send(json_encode([
            'type' => 'room_state',
            'payload' => ['roles' => $this->connections->getRolesInRoom($sessionId)],
        ]));

        // Notify others that a peer joined
        $this->broadcastJson($sessionId, [
            'type' => 'peer_joined',
            'payload' => ['role' => $role],
        ], $conn);
    }

    private function onBroadcast(ConnectionInterface $from, string $type, array $payload): void {
        $info = $this->connections->getConnectionInfo($from);
        if (!$info) return;

        $sessionId = $info['session_id'] ?? null;
        if (!is_string($sessionId) || $sessionId === '') return;

        error_log("[WebSocket] Broadcasting $type from role: " . ($info['role'] ?? 'unknown'));

        $this->broadcastJson($sessionId, [
            'type' => $type,
            'payload' => $payload,
            'role' => $info['role'] ?? '',
        ], $from);
    }

    private function onSubmitCode(ConnectionInterface $from, array $payload): void {
        $info = $this->connections->getConnectionInfo($from);
        if (!$info) return;

        $sessionId = $info['session_id'] ?? null;
        if (!is_string($sessionId) || $sessionId === '') return;

        $questionId = $payload['question_id'] ?? null;
        $code = $payload['code'] ?? null;
        $whiteboardSnapshot = $payload['whiteboard_snapshot'] ?? null;

        if (is_string($questionId) && is_string($code)) {
            $this->codeSnapshot->create($sessionId, $questionId, $code, true, $whiteboardSnapshot);
        }

        $this->onBroadcast($from, 'submit_code', $payload);
    }

    private function broadcastJson(string $sessionId, array $data, ?ConnectionInterface $except = null): void {
        $json = json_encode($data);
        $this->connections->broadcast($sessionId, $json, $except);
    }

    public function handleClose(ConnectionInterface $conn): void {
        $info = $this->connections->removeConnection($conn);
        if (!$info) return;

        $sessionId = $info['session_id'];
        $role = $info['role'] ?? '';

        $this->broadcastJson($sessionId, [
            'type' => 'peer_left',
            'payload' => ['role' => $role],
        ]);

        // If interviewer disconnects, auto-end the session.
        if ($role === 'interviewer') {
            $this->sessionService->endSession($sessionId);
            $this->broadcastJson($sessionId, [
                'type' => 'session_ended',
                'payload' => ['reason' => 'interviewer_disconnected'],
            ]);
            $this->cleanupSessionNavigationState($sessionId);
            return;
        }

        // If nobody is left in the room, mark session ended.
        if (!$this->connections->isRoomActive($sessionId)) {
            $this->sessionService->endSession($sessionId);
            $this->cleanupSessionNavigationState($sessionId);
        }
    }

    public function handleError(ConnectionInterface $conn, \Exception $e): void {
        $this->handleClose($conn);
    }

    private function decodeJsonArray($raw): array {
        if (is_array($raw)) {
            return $raw;
        }
        if (!is_string($raw) || $raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function isQuestionInSession(string $sessionId, string $questionId): bool {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT 1 FROM session_questions WHERE session_id = ? AND question_id = ? LIMIT 1');
        $stmt->execute([$sessionId, $questionId]);
        if ($stmt->fetchColumn()) {
            return true;
        }

        return false;
    }

    private function buildSetQuestionPayloadFromRow(string $questionId, array $row, string $navPermission): array {
        $testCases = $this->decodeJsonArray($row['test_cases'] ?? []);
        $visibleTestCases = [];
        foreach ($testCases as $tc) {
            if (!is_array($tc)) {
                continue;
            }

            $isHidden = !empty($tc['is_hidden']) || !empty($tc['isHidden']);
            if ($isHidden) {
                continue;
            }

            $visibleTestCases[] = [
                'input' => (string)($tc['input'] ?? ''),
                'expectedOutput' => (string)($tc['expected_output'] ?? $tc['expectedOutput'] ?? ''),
                'isHidden' => false,
            ];
        }

        $evaluationCriteria = [];
        foreach ($this->decodeJsonArray($row['evaluation_criteria'] ?? []) as $criterion) {
            if (!is_array($criterion)) {
                continue;
            }

            $evaluationCriteria[] = [
                'id' => (string)($criterion['id'] ?? ''),
                'label' => (string)($criterion['label'] ?? ''),
                'maxScore' => (int)($criterion['max_score'] ?? $criterion['maxScore'] ?? 0),
                'currentScore' => (int)($criterion['current_score'] ?? $criterion['currentScore'] ?? 0),
            ];
        }

        $templateCode = [
            'solution.php' => (string)($row['template_code'] ?? ''),
        ];
        $templateFiles = $this->decodeJsonArray($row['template_files_json'] ?? []);
        $isAssocTemplateFiles = !empty($templateFiles) && array_keys($templateFiles) !== range(0, count($templateFiles) - 1);
        if ($isAssocTemplateFiles) {
            $templateCode = $templateFiles;
        }

        $difficulty = (string)($row['difficulty'] ?? 'easy');
        if (!in_array($difficulty, ['easy', 'medium', 'hard'], true)) {
            $difficulty = 'easy';
        }

        $level = (string)($row['level'] ?? 'junior');
        if (!in_array($level, ['intern', 'junior', 'senior'], true)) {
            $level = 'junior';
        }

        $kind = (string)($row['kind'] ?? 'coding');
        if (!in_array($kind, ['coding', 'present'], true)) {
            $kind = 'coding';
        }

        if (!in_array($navPermission, ['none', 'prev_only', 'both'], true)) {
            $navPermission = 'none';
        }

        return [
            'question_id' => $questionId,
            'nav_permission' => $navPermission,
            'question' => [
                'id' => (string)$row['id'],
                'title' => (string)$row['title'],
                'description' => (string)$row['description'],
                'difficulty' => $difficulty,
                'level' => $level,
                'kind' => $kind,
                'templateCode' => $templateCode,
                'visibleTestCases' => $visibleTestCases,
                'evaluationCriteria' => $evaluationCriteria,
            ],
        ];
    }

    private function loadSetQuestionPayload(string $sessionId, string $questionId, string $navPermission): ?array {
        if (!$this->isQuestionInSession($sessionId, $questionId)) {
            return null;
        }

        $row = $this->questionModel->getQuestionById($questionId);
        if (!$row) {
            return null;
        }

        return $this->buildSetQuestionPayloadFromRow($questionId, $row, $navPermission);
    }

    private function onSetQuestion(ConnectionInterface $from, array $payload): void {
        $info = $this->connections->getConnectionInfo($from);
        if (!$info) {
            return;
        }

        $sessionId = (string)($info['session_id'] ?? '');
        $role = (string)($info['role'] ?? '');
        if ($sessionId === '' || $role !== 'interviewer') {
            return;
        }

        $questionId = (string)($payload['question_id'] ?? '');
        if ($questionId === '') {
            return;
        }

        $navPermission = (string)($payload['nav_permission'] ?? 'none');
        if (!in_array($navPermission, ['none', 'prev_only', 'both'], true)) {
            $navPermission = 'none';
        }

        $setQuestionPayload = $this->loadSetQuestionPayload($sessionId, $questionId, $navPermission);
        if ($setQuestionPayload === null) {
            return;
        }

        $this->sessionNavPermission[$sessionId] = $navPermission;
        $this->sessionInterviewerQuestionId[$sessionId] = $questionId;
        $this->sessionCandidateQuestionId[$sessionId] = $questionId;

        $this->broadcastJson($sessionId, [
            'type' => 'set_question',
            'payload' => $setQuestionPayload,
            'role' => $role,
        ], $from);
    }

    private function handleNavigateQuestion(ConnectionInterface $from, array $payload): void {
        $info = $this->connections->getConnectionInfo($from);
        if (!$info) {
            return;
        }

        $sessionId = (string)($info['session_id'] ?? '');
        $role = (string)($info['role'] ?? '');
        if ($sessionId === '' || $role !== 'candidate') {
            return;
        }

        $direction = (string)($payload['direction'] ?? '');
        if ($direction !== 'prev') {
            return;
        }

        $navPermission = (string)($this->sessionNavPermission[$sessionId] ?? 'none');
        if (!in_array($navPermission, ['prev_only', 'both'], true)) {
            return;
        }

        $currentId = (string)($payload['current_question_id'] ?? '');
        if ($currentId === '') {
            $currentId = (string)($this->sessionCandidateQuestionId[$sessionId] ?? '');
        }
        if ($currentId === '') {
            $currentId = (string)($this->sessionInterviewerQuestionId[$sessionId] ?? '');
        }
        if ($currentId === '') {
            return;
        }

        $targetId = $this->sessionQuestionService->getPrevQuestionId($sessionId, $currentId);
        if ($targetId === null) {
            return;
        }

        $setQuestionPayload = $this->loadSetQuestionPayload($sessionId, $targetId, $navPermission);
        if ($setQuestionPayload === null) {
            return;
        }

        $this->sessionCandidateQuestionId[$sessionId] = $targetId;

        $from->send(json_encode([
            'type' => 'set_question',
            'payload' => $setQuestionPayload,
            'role' => 'candidate',
        ]));
    }

    private function cleanupSessionNavigationState(string $sessionId): void {
        unset($this->sessionNavPermission[$sessionId]);
        unset($this->sessionInterviewerQuestionId[$sessionId]);
        unset($this->sessionCandidateQuestionId[$sessionId]);
    }
}

?>

# Jotform Interview Platform — Implementation Roadmap

## Monorepo Structure

```
interview/
├── package.json                          # Workspace root (npm workspaces)
├── .gitignore
├── IMPLEMENTATION_ROADMAP.md
├── packages/
│   ├── frontend/                         # React + Vite + Monaco (✅ DONE)
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── public/
│   │   │   ├── assets/jotform-logo.svg
│   │   │   └── css/jotform-theme.css
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx                   # Token-based routing: /interview/:token
│   │       ├── App.css
│   │       ├── components/
│   │       │   ├── Header/Header.tsx     # Logo, timer, End Session btn
│   │       │   ├── Sidebar/InterviewerSidebar.tsx
│   │       │   ├── Sidebar/IntervieweeSidebar.tsx
│   │       │   ├── Editor/CodeEditor.tsx # Monaco, PHP only
│   │       │   ├── Editor/EditorToolbar.tsx
│   │       │   └── Output/OutputPanel.tsx
│   │       ├── pages/
│   │       │   ├── InterviewPage.tsx     # Token → role resolver
│   │       │   ├── InterviewerPage.tsx   # 3-col: sidebar | editor | solution+checklist
│   │       │   └── IntervieweePage.tsx   # 2-col: problem | editor+output
│   │       ├── hooks/                    # (Phase 8)
│   │       ├── services/                 # (Phase 9)
│   │       └── contexts/                 # (Phase 8)
│   │
│   └── backend/                          # PHP Backend
│       ├── composer.json
│       ├── bin/
│       │   ├── server.php                # CLI: starts Ratchet WS server
│       │   └── seed.php                  # CLI: seeds question bank into DB
│       ├── public/
│       │   └── index.php                 # REST API entry (plain PHP router)
│       ├── database/
│       │   ├── schema.sql                # DDL
│       │   └── interview.sqlite          # SQLite DB file (gitignored)
│       ├── seeds/
│       │   └── questions.json            # Question bank data
│       └── src/
│           ├── Config/
│           │   └── Database.php
│           ├── Models/
│           │   ├── Session.php
│           │   ├── Token.php
│           │   ├── Question.php
│           │   ├── Evaluation.php
│           │   └── CodeSnapshot.php
│           ├── Routes/
│           │   ├── Router.php
│           │   ├── SessionRoutes.php
│           │   ├── QuestionRoutes.php
│           │   └── EvaluationRoutes.php
│           ├── Services/
│           │   ├── SessionService.php
│           │   ├── TokenService.php
│           │   ├── QuestionService.php
│           │   ├── EvaluationService.php
│           │   └── ReportService.php
│           └── WebSocket/
│               ├── Server.php
│               ├── ConnectionManager.php
│               └── MessageHandler.php
```

---

## Design Language Reference

- **Brand colors**: `--jotform-blue: #0099FF`, `--jotform-orange: #FF6100`, `--jotform-yellow: #FFB629`, `--jotform-navy: #0A1551`
- **Header**: Navy gradient `linear-gradient(135deg, #0A1551 0%, #1a2a6c 100%)`, white text
- **Favicon**: `https://cdn.jotfor.ms/assets/resources/svg/jotform-icon-transparent.svg`
- **Code font**: `'Fira Code', 'Monaco', monospace`
- **Primary button**: orange `#FF6100`, hover `#e55700`

---

## Auth & Routing Model

URL'de role bilgisi yok. Her session için 2 opaque token üretilir:

```
POST /api/sessions → {
  interviewer_token: "int_8f3a...",   →  /interview/int_8f3a...
  candidate_token:   "cnd_b72e...",   →  /interview/cnd_b72e...
}

GET /api/resolve/:token → { role: "interviewer"|"candidate", session_id: "..." }
```

Candidate, interviewer ekranına hiçbir şekilde erişemez. Token → role mapping backend'de saklanır.

---

## ✅ Phase 1: Frontend UI (DONE)

Tamamlanan dosyalar: `vite.config.ts`, `tsconfig.json`, `index.html`, `main.tsx`, `App.tsx`, `App.css`, `Header.tsx`, `InterviewerSidebar.tsx`, `IntervieweeSidebar.tsx`, `CodeEditor.tsx`, `EditorToolbar.tsx`, `OutputPanel.tsx`, `InterviewPage.tsx`, `InterviewerPage.tsx`, `IntervieweePage.tsx`

---

## Phase 2: PHP Backend — Project Scaffolding

### Task 2.1 — Composer project init
**File**: `packages/backend/composer.json`
```json
{
  "require": {
    "cboden/ratchet": "^0.4",
    "react/event-loop": "^1.4"
  },
  "autoload": {
    "psr-4": { "App\\": "src/" }
  }
}
```
- `composer install` ile bağımlılıkları kur
- PSR-4 autoload: `App\` → `src/`

### Task 2.2 — Database config
**File**: `packages/backend/src/Config/Database.php`
- `class Database`
  - `private static ?PDO $instance = null`
  - `public static function getConnection(): PDO` — singleton, `interview.sqlite`'a bağlanır, `ERRMODE_EXCEPTION` + `FETCH_ASSOC` ayarlar
  - `public static function init(): void` — `schema.sql` dosyasını okur ve çalıştırır (tablo yoksa oluşturur)

### Task 2.3 — SQLite schema
**File**: `packages/backend/database/schema.sql`
```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'waiting',  -- waiting | active | ended
    candidate_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    ended_at TEXT
);

CREATE TABLE IF NOT EXISTS tokens (
    token TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('interviewer', 'candidate')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category TEXT NOT NULL,
    template_code TEXT NOT NULL DEFAULT '',   -- PHP template
    test_cases TEXT NOT NULL DEFAULT '[]',    -- JSON: [{input, expected_output, is_hidden}]
    evaluation_criteria TEXT NOT NULL DEFAULT '[]', -- JSON: [{id, label, max_score}]
    sort_order INTEGER NOT NULL DEFAULT 0
    session_id TEXT NOT NULL,
);

CREATE TABLE IF NOT EXISTS session_questions (
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, question_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    criteria_scores TEXT NOT NULL DEFAULT '{}', -- JSON: {criterion_id: score}
    notes TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS code_snapshots (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    code TEXT NOT NULL,
    is_submission INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

---

## Phase 3: PHP Backend — Token & Session Service

### Task 3.1 — Token Service
**File**: `packages/backend/src/Services/TokenService.php`
- `class TokenService`
  - `public function generateToken(string $prefix): string` — `$prefix . '_' . bin2hex(random_bytes(16))` (32 hex char) döner
  - `public function createSessionTokens(string $sessionId): array` — `interviewer` ve `candidate` için 2 token üretir, `tokens` tablosuna INSERT eder, `['interviewer_token' => ..., 'candidate_token' => ...]` döner
  - `public function resolveToken(string $token): ?array` — `tokens` tablosundan token ile sorgular, `['role' => ..., 'session_id' => ...]` veya `null` döner
  - `public function invalidateSessionTokens(string $sessionId): void` — session'a ait tüm token'ları siler

### Task 3.2 — Session Model
**File**: `packages/backend/src/Models/Session.php`
- `class Session`
  - `public function create(): string` — yeni session oluşturur (`id = uniqid prefix 'ses_'`), session ID döner
  - `public function findById(string $id): ?array` — session satırını döner
  - `public function updateStatus(string $id, string $status): void` — `status` + ilgili timestamp günceller (`active` → `started_at`, `ended` → `ended_at`)
  - `public function delete(string $id): void` — session'ı siler (CASCADE ile token, evaluation vb. de silinir)

### Task 3.3 — Token Model
**File**: `packages/backend/src/Models/Token.php`
- `class Token`
  - `public function insert(string $token, string $sessionId, string $role): void`
  - `public function findByToken(string $token): ?array`
  - `public function deleteBySessionId(string $sessionId): void`

### Task 3.4 — Session Service
**File**: `packages/backend/src/Services/SessionService.php`
- `class SessionService`
  - `private TokenService $tokenService`
  - `private Session $sessionModel`
  - `public function createSession(?string $candidateName): array` — Session oluşturur, token'lar üretir. Döner: `{ session_id, interviewer_token, candidate_token, interviewer_url, candidate_url }`
  - `public function resolveToken(string $token): ?array` — TokenService proxy, role + session_id döner
  - `public function startSession(string $sessionId): void` — status → `active`, `started_at` set
  - `public function endSession(string $sessionId): void` — status → `ended`, `ended_at` set
  - `public function getSession(string $sessionId): ?array` — session detaylarını döner

---

## Phase 4: PHP Backend — REST API

### Task 4.1 — Router
**File**: `packages/backend/src/Routes/Router.php`
- `class Router`
  - `private array $routes = []`
  - `public function get(string $path, callable $handler): void`
  - `public function post(string $path, callable $handler): void`
  - `public function put(string $path, callable $handler): void`
  - `public function patch(string $path, callable $handler): void`
  - `public function delete(string $path, callable $handler): void`
  - `public function dispatch(string $method, string $uri): void` — URI'yi parse eder, `:param` pattern'leri match eder, handler'ı çağırır. 404 → JSON `{"error": "Not found"}`
  - Path params: `/api/sessions/:id` → handler `$params['id']` alır
  - Her handler'a `$params` (path params) ve `$body` (JSON decoded POST body) geçilir
  - Response helper: `json(array $data, int $status = 200)` — `Content-Type: application/json`, `http_response_code`, `json_encode`

### Task 4.2 — REST entry point
**File**: `packages/backend/public/index.php`
- `require __DIR__ . '/../vendor/autoload.php'`
- CORS header'ları set et: `Access-Control-Allow-Origin: *`, `Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`, `Allow-Headers: Content-Type`
- OPTIONS request'leri 204 ile bitir
- `Database::init()` çağır
- Router oluştur, tüm route'ları register et
- `$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI'])`

### Task 4.3 — Session Routes
**File**: `packages/backend/src/Routes/SessionRoutes.php`
- `class SessionRoutes`
  - `public static function register(Router $router): void`
  - `POST /api/sessions` → `SessionService::createSession($body['candidate_name'] ?? null)` → 201 JSON `{ session_id, interviewer_token, candidate_token, interviewer_url, candidate_url }`
  - `GET /api/resolve/:token` → `SessionService::resolveToken($params['token'])` → 200 `{ role, session_id }` veya 404
  - `GET /api/sessions/:id` → `SessionService::getSession($params['id'])` → 200 veya 404
  - `PATCH /api/sessions/:id` → body `{ status: 'active'|'ended' }` → `startSession` veya `endSession` çağır → 200
  - `GET /api/sessions/:id/report` → `ReportService::generate($params['id'])` → 200

### Task 4.4 — Question Routes
**File**: `packages/backend/src/Routes/QuestionRoutes.php`
- `class QuestionRoutes`
  - `public static function register(Router $router): void`
  - `GET /api/questions/bank` → tüm question'ları döner (question tablosu)
  - `GET /api/sessions/:id/questions` → session'a atanmış question'ları döner (session_questions join)
  - `POST /api/sessions/:id/questions` → body `{ question_id }` → session_questions'a ekler → 201
  - `DELETE /api/sessions/:id/questions/:qid` → session_questions'dan siler → 204

### Task 4.5 — Evaluation Routes
**File**: `packages/backend/src/Routes/EvaluationRoutes.php`
- `class EvaluationRoutes`
  - `public static function register(Router $router): void`
  - `PUT /api/sessions/:sid/questions/:qid/evaluation` → body `{ criteria_scores, notes }` → UPSERT evaluation → 200
  - `GET /api/sessions/:sid/evaluations` → session'ın tüm evaluation'larını döner → 200

---

## Phase 5: PHP Backend — Models

### Task 5.1 — Question Model
**File**: `packages/backend/src/Models/Question.php`
- `class Question`
  - `public function findAll(): array` — tüm soruları döner
  - `public function findById(string $id): ?array`
  - `public function findBySessionId(string $sessionId): array` — session_questions JOIN questions
  - `public function addToSession(string $sessionId, string $questionId, int $sortOrder): void`
  - `public function removeFromSession(string $sessionId, string $questionId): void`

### Task 5.2 — Evaluation Model
**File**: `packages/backend/src/Models/Evaluation.php`
- `class Evaluation`
  - `public function upsert(string $sessionId, string $questionId, string $criteriaScoresJson, string $notes): void` — INSERT OR REPLACE
  - `public function findBySession(string $sessionId): array`
  - `public function findBySessionAndQuestion(string $sessionId, string $questionId): ?array`

### Task 5.3 — CodeSnapshot Model
**File**: `packages/backend/src/Models/CodeSnapshot.php`
- `class CodeSnapshot`
  - `public function save(string $sessionId, string $questionId, string $code, bool $isSubmission): string` — INSERT, ID döner
  - `public function findBySession(string $sessionId): array`
  - `public function findLatestByQuestion(string $sessionId, string $questionId): ?array`

---

## Phase 6: PHP Backend — Services

### Task 6.1 — Question Service
**File**: `packages/backend/src/Services/QuestionService.php`
- `class QuestionService`
  - `private Question $model`
  - `public function getBank(): array` — tüm soru bankasını döner
  - `public function getSessionQuestions(string $sessionId): array` — session'ın sorularını döner, `test_cases` ve `evaluation_criteria` JSON decode edilmiş
  - `public function assignToSession(string $sessionId, string $questionId): void`
  - `public function removeFromSession(string $sessionId, string $questionId): void`

### Task 6.2 — Evaluation Service
**File**: `packages/backend/src/Services/EvaluationService.php`
- `class EvaluationService`
  - `private Evaluation $model`
  - `public function saveEvaluation(string $sessionId, string $questionId, array $criteriaScores, string $notes): void` — JSON encode edip model'e geçir
  - `public function getSessionEvaluations(string $sessionId): array` — JSON decode edilmiş evaluation listesi

### Task 6.3 — Report Service
**File**: `packages/backend/src/Services/ReportService.php`
- `class ReportService`
  - `public function generate(string $sessionId): array` — Döner:
    ```
    {
      session: { id, status, candidate_name, duration_seconds, started_at, ended_at },
      questions: [{
        id, title, difficulty,
        evaluation: { criteria_scores, notes, total_score, max_score },
        final_code: string
      }],
      summary: { total_score, max_possible_score, percentage, question_count }
    }
    ```
  - Session + questions + evaluations + code_snapshots hepsini birleştirir

---

## Phase 7: PHP Backend — WebSocket Server

### Task 7.1 — Connection Manager
**File**: `packages/backend/src/WebSocket/ConnectionManager.php`
- `class ConnectionManager`
  - `private array $rooms = []` — `[sessionId => [connectionId => ['conn' => ConnectionInterface, 'role' => string]]]`
  - `public function addToRoom(string $sessionId, string $role, ConnectionInterface $conn): void` — room'a ekler, max 2 kişi kontrolü
  - `public function removeConnection(ConnectionInterface $conn): ?array` — connection'ı bulur, room'dan çıkarır, `['session_id' => ..., 'role' => ...]` döner
  - `public function getRoomPeer(string $sessionId, ConnectionInterface $self): ?ConnectionInterface` — aynı room'daki diğer kişiyi döner
  - `public function broadcast(string $sessionId, string $message, ?ConnectionInterface $except = null): void` — room'daki herkese (except hariç) gönderir
  - `public function isRoomActive(string $sessionId): bool` — room'da en az 1 connection var mı

### Task 7.2 — Message Handler
**File**: `packages/backend/src/WebSocket/MessageHandler.php`
- `class MessageHandler`
  - `private ConnectionManager $connections`
  - `public function handle(ConnectionInterface $from, string $rawMessage): void` — JSON decode, `type` field'a göre dispatch:
    - `JOIN_SESSION`: `TokenService::resolveToken(payload.token)` → role al, `ConnectionManager::addToRoom()`, diğer participant'a `PEER_JOINED` gönder
    - `CODE_CHANGE`: payload `{ code }` → room peer'a forward et
    - `CURSOR_MOVE`: payload `{ line, column }` → room peer'a forward et
    - `SET_QUESTION`: (sadece interviewer) payload `{ question_id }` → candidate'e forward et
    - `RUN_CODE`: payload `{ code }` → sonucu gönderene `CODE_OUTPUT` olarak dön
    - `SUBMIT_CODE`: payload `{ code, question_id }` → `CodeSnapshot::save()` ile kaydet, interviewer'a notify et
    - `EVALUATION_UPDATE`: (sadece interviewer) → DB'ye kaydet
  - `public function handleDisconnect(ConnectionInterface $conn): void` — `ConnectionManager::removeConnection()`, peer'a `PEER_LEFT` gönder

### Task 7.3 — Ratchet WS Server
**File**: `packages/backend/src/WebSocket/Server.php`
- `class InterviewWebSocket implements MessageComponentInterface`
  - `private MessageHandler $handler`
  - `public function onOpen(ConnectionInterface $conn): void` — log
  - `public function onMessage(ConnectionInterface $from, $msg): void` — `$this->handler->handle($from, $msg)`
  - `public function onClose(ConnectionInterface $conn): void` — `$this->handler->handleDisconnect($conn)`
  - `public function onError(ConnectionInterface $conn, \Exception $e): void` — log, close

### Task 7.4 — Server entry point
**File**: `packages/backend/bin/server.php`
- `require __DIR__ . '/../vendor/autoload.php'`
- `Database::init()`
- Ratchet `IoServer` + `HttpServer` + `WsServer` oluştur
- Port: `8080` (WS)
- `echo "WebSocket server running on ws://0.0.0.0:8080\n"`
- `$server->run()`

---

## Phase 8: Frontend — Backend Integration

### Task 8.1 — WebSocket client hook
**File**: `packages/frontend/src/hooks/useWebSocket.ts`
- `function useWebSocket(token: string)`
  - `ws://localhost:8080` adresine bağlan
  - Bağlanınca `JOIN_SESSION` gönder: `{ type: 'JOIN_SESSION', payload: { token } }`
  - Auto-reconnect: exponential backoff (1s, 2s, 4s, max 30s)
  - Offline message queue: bağlantı yokken gönderilen mesajları tamponla
  - Return: `{ sendMessage, lastMessage, status: 'connecting'|'connected'|'disconnected' }`

### Task 8.2 — Session context
**File**: `packages/frontend/src/contexts/SessionContext.tsx`
- `SessionProvider` component
  - Mount'ta: `GET /api/resolve/:token` → role + session_id al
  - `GET /api/sessions/:sessionId` → session detayları
  - `GET /api/sessions/:sessionId/questions` → soru listesi
  - WebSocket hook'u başlat
  - Context value: `{ session, questions, currentQuestion, role, ws, setCurrentQuestion }`

### Task 8.3 — Editor context
**File**: `packages/frontend/src/contexts/EditorContext.tsx`
- `EditorProvider` component
  - State: `code`, `isRunning`, `output`, `error`
  - `handleCodeChange(newCode)`: local state güncelle + WS `CODE_CHANGE` gönder (150ms debounce)
  - Incoming `CODE_CHANGE` → code state güncelle (send loop'u tetiklemeden)
  - `handleRun()`: WS `RUN_CODE` gönder, `isRunning = true`, `CODE_OUTPUT` gelince güncelle
  - `handleSubmit()`: WS `SUBMIT_CODE` gönder

### Task 8.4 — Frontend token resolver'ı backend'e bağla
**File**: `packages/frontend/src/App.tsx`
- `resolveRole()` fonksiyonunu `GET /api/resolve/:token` API call'a çevir
- Demo token sabitlerini kaldır

---

## Phase 9: PHP-WASM — In-Browser Code Execution

### Task 9.1 — PHP-WASM integration
**File**: `packages/frontend/src/services/phpWasm.ts`
- `seanmorris/php-wasm` paketini kullan
- `initPhp(): Promise<void>` — WASM binary'yi yükle (sayfa açıldığında)
- `runPhp(code: string, stdin?: string): Promise<{ stdout: string, stderr: string, exitCode: number }>` — kodu çalıştır
- 10 saniye timeout (infinite loop protection)
- `<?php` tag'i yoksa otomatik ekle

### Task 9.2 — Test case runner
**File**: `packages/frontend/src/services/testRunner.ts`
- `runTests(code: string, testCases: TestCase[]): Promise<TestResult[]>`
  - Her test case için `runPhp(code, testCase.input)` çağır
  - stdout'u trim edip `expected_output` ile karşılaştır
  - Döner: `{ passed, input, expected, actual, executionTimeMs }[]`
- `getTestSummary(results: TestResult[]): string` — `"3/5 test passed"`

---

## Phase 10: Question Bank Seed Data

### Task 10.1 — Seed questions
**File**: `packages/backend/seeds/questions.json`
- 10 PHP coding sorusu:
  1. Two Sum (easy, Arrays)
  2. Valid Parentheses (easy, Strings)
  3. Reverse Linked List (easy, Linked Lists)
  4. Merge Two Sorted Arrays (easy, Arrays)
  5. FizzBuzz (easy, Basics)
  6. Binary Search (medium, Arrays)
  7. Merge Intervals (medium, Arrays)
  8. Group Anagrams (medium, Strings)
  9. LRU Cache (hard, Design)
  10. Longest Substring Without Repeating Characters (medium, Strings)
- Her soru: `{ id, title, description, difficulty, category, template_code, test_cases: [{input, expected_output, is_hidden}], evaluation_criteria: [{id, label, max_score}], session_id }`

### Task 10.2 — Seed loader script
**File**: `packages/backend/bin/seed.php`
- `require autoload`
- `Database::init()`
- `questions.json` oku, her question'ı INSERT OR IGNORE ile DB'ye yaz
- `echo "Seeded X questions\n"`

---

## Phase 11: Report & Session End

### Task 11.1 — Report endpoint tamamla
- `GET /api/sessions/:id/report` → `ReportService::generate()`
- JSON rapor döner (Phase 6.3'teki format)

### Task 11.2 — End Session akışı
- Interviewer "End Session" tıklar → frontend `PATCH /api/sessions/:id { status: 'ended' }` gönderir
- Backend: session status günceller, WS üzerinden `SESSION_ENDED` broadcast eder
- Candidate ekranında: editor read-only olur, "Mülakat sona erdi" mesajı görünür
- Interviewer: rapor sayfasına yönlendirilir

---

## Implementation Order

```
Phase 1  ✅ Frontend UI (DONE)
Phase 2  ✅ Backend scaffolding (composer, DB config, schema)
Phase 3  ✅ Token & Session services (core auth)
Phase 4  → REST API (router, endpoints)
Phase 5  ✅ Models (Question, Evaluation, CodeSnapshot)
Phase 6  → Services (Question, Evaluation, Report)
Phase 7  → WebSocket server (Ratchet, rooms, messages)
Phase 8  → Frontend ↔ Backend integration
Phase 9  → PHP-WASM in-browser execution
Phase 10 → Question bank seed data
Phase 11 → Report & session end flow

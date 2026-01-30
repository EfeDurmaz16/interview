# Jotform Interview Platform - Implementation Roadmap

## Monorepo Structure

```
interview/
├── package.json                     # Workspace root
├── packages/
│   ├── shared/                      # Shared types & constants
│   │   └── src/
│   │       └── index.ts             # WebSocket message types, question types, session types
│   ├── frontend/                    # React + Vite + Monaco
│   │   ├── public/
│   │   │   ├── assets/
│   │   │   │   └── jotform-logo.svg # Header logo (120x30)
│   │   │   └── css/
│   │   │       └── jotform-theme.css # Jotform design language
│   │   └── src/
│   │       ├── components/
│   │       │   ├── Header/          # Jotform branded header
│   │       │   ├── Sidebar/         # Question list (interviewer), problem desc (interviewee)
│   │       │   ├── Editor/          # Monaco editor wrapper
│   │       │   ├── Output/          # Code output/errors panel
│   │       │   └── Chat/            # Voice/text chat bar
│   │       ├── hooks/               # useWebSocket, usePhpWasm, useSession
│   │       ├── services/            # WebSocket client, PHP-WASM runner
│   │       ├── contexts/            # SessionContext, EditorContext
│   │       └── types/
│   └── backend/                     # PHP + Ratchet WebSocket + SQLite
│       ├── composer.json            # PHP dependencies (Ratchet, PDO)
│       ├── public/
│       │   └── index.php            # REST API entry point (plain PHP router)
│       ├── src/
│       │   ├── WebSocket/           # Ratchet WS server, room management, cursor sync
│       │   ├── Routes/              # REST: sessions, questions, evaluations
│       │   ├── Models/              # PDO + SQLite schemas
│       │   ├── Services/            # Session logic, scoring
│       │   └── Config/
│       └── bin/
│           └── server.php           # CLI entry: starts Ratchet WS + REST server
```

---

## Design Language Reference

- **Brand colors**: `--jotform-blue: #0099FF`, `--jotform-orange: #FF6100`, `--jotform-yellow: #FFB629`, `--jotform-navy: #0A1551`
- **Header**: Navy gradient `linear-gradient(135deg, #0A1551 0%, #1a2a6c 100%)`, white text
- **Header logo**: `https://cdn.jotfor.ms/assets/resources/svg/jotform-logo-transparent-W.svg` (120px x 30px)
- **Favicon**: `https://cdn.jotfor.ms/assets/resources/svg/jotform-icon-transparent.svg`
- **Font**: `'Circular', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Code font**: `'Fira Code', 'Monaco', monospace`
- **Primary button**: orange `#FF6100`, hover `#e55700`
- **Border radius**: 8px (buttons, inputs), 12px (panels)
- **Shadows**: `0 2px 8px rgba(0,0,0,0.06)` for panels

---

## Phase 1: Shared Types & Project Scaffolding

### Task 1.1 — Define shared WebSocket message types
**File**: `packages/shared/src/index.ts`
- Define `enum WSMessageType` with values: `JOIN_SESSION`, `LEAVE_SESSION`, `CODE_CHANGE`, `CURSOR_MOVE`, `SET_QUESTION`, `RUN_CODE`, `CODE_OUTPUT`, `EVALUATION_UPDATE`, `CHAT_MESSAGE`
- Define `interface WSMessage<T>` with fields: `type: WSMessageType`, `sessionId: string`, `userId: string`, `role: 'interviewer' | 'interviewee'`, `payload: T`, `timestamp: number`
- Define `interface Question` with: `id`, `title`, `description`, `difficulty`, `category`, `templateCode: Record<string, string>` (per language), `testCases: TestCase[]`, `evaluationCriteria: EvaluationCriterion[]`
- Define `interface TestCase` with: `input`, `expectedOutput`, `isHidden`
- Define `interface EvaluationCriterion` with: `id`, `label`, `maxScore`, `currentScore`, `notes`
- Define `interface Session` with: `id`, `interviewerId`, `intervieweeId`, `status`, `questions`, `startTime`, `endTime`

### Task 1.2 — Configure Vite for frontend
**File**: `packages/frontend/vite.config.ts`
- Setup `@vitejs/plugin-react`
- Set dev server port 3000
- Proxy `/api` to backend at `localhost:8000`
- Proxy `/ws` to WebSocket backend

### Task 1.3 — Create frontend entry point
**Files**: `packages/frontend/index.html`, `packages/frontend/src/main.tsx`, `packages/frontend/src/App.tsx`
- Include Jotform favicon, Fira Code font, `jotform-theme.css`
- `App.tsx`: React Router with routes `/interview/:sessionId/interviewer` and `/interview/:sessionId/interviewee`

---

## Phase 2: Frontend — Core UI Components

### Task 2.1 — Header component
**File**: `packages/frontend/src/components/Header/Header.tsx`
- Jotform navy gradient header
- Logo: `jotform-logo-transparent-W.svg` at 120x30px
- Title: "Code Interview Platform"
- Right side: session timer (MM:SS), candidate name (interviewer view), recording indicator
- Use CSS classes from `jotform-theme.css` (`.header`, `.header__brand`, `.header__logo`, `.header__title`)

### Task 2.2 — Sidebar component (Interviewer view)
**File**: `packages/frontend/src/components/Sidebar/InterviewerSidebar.tsx`
- **Top section**: Scrollable list of questions, each showing title + difficulty badge + category tag
- Clicking a question sends it to the interviewee via WebSocket (`SET_QUESTION`)
- **Middle section**: Evaluation criteria checkboxes with score sliders (per the active question)
- **Bottom section**: Question bank browser grouped by category (Arrays, Strings, Trees, etc.)
- Active question highlighted with `--jotform-blue` left border
- Use Jotform button styles (`.btn--primary`, `.btn--secondary`)

### Task 2.3 — Sidebar component (Interviewee view)
**File**: `packages/frontend/src/components/Sidebar/IntervieweeSidebar.tsx`
- **Title**: Current question name + difficulty badge
- **Description**: Problem statement in markdown
- **Examples**: Input/output pairs in code blocks
- **Constraints**: Bullet list
- Scrollable, Jotform panel styling (white bg, 12px radius, shadow)

### Task 2.4 — Monaco Editor wrapper
**File**: `packages/frontend/src/components/Editor/CodeEditor.tsx`
- Use `@monaco-editor/react`
- Dark theme (VS Code dark)
- Language selector in toolbar (Python, C, C++, Java, Go, Rust, PHP)
- Editor header bar (dark bg `#1e1e1e`) showing filename
- On every keystroke, debounce 150ms and send `CODE_CHANGE` via WebSocket
- Accept incoming `CODE_CHANGE` messages and apply without triggering send loop
- Show remote cursor position with colored marker (interviewer = blue, interviewee = orange)

### Task 2.5 — Editor toolbar
**File**: `packages/frontend/src/components/Editor/EditorToolbar.tsx`
- Language dropdown (`.select` styling from theme)
- "Run Code" button (`.btn--primary`, orange) — triggers PHP-WASM execution or sends `RUN_CODE` to backend
- "Clear" button (`.btn--secondary`)
- "Submit" button for interviewee (`.btn--primary`)

### Task 2.6 — Output panel
**File**: `packages/frontend/src/components/Output/OutputPanel.tsx`
- Tabs: "Output" / "Errors" (`.output-tab` styling)
- Code output in monospace (`Fira Code`)
- Test case results: green checkmark or red X per test case, showing input/output/expected
- Status bar at bottom: running indicator (pulsing orange dot), execution time, "Press Ctrl+Enter to run"
- Error panel: red text, compilation error with line number, optional hint

### Task 2.7 — Chat/Communication bar
**File**: `packages/frontend/src/components/Chat/ChatBar.tsx`
- Fixed footer bar
- Buttons: Mute, Video Off, Ask Hint (interviewee only)
- Text chat input
- "Voice Chat: Connected" status indicator
- Chat messages sent via WebSocket `CHAT_MESSAGE`

---

## Phase 3: PHP-WASM Integration (In-Browser Code Execution)

### Task 3.1 — Evaluate and integrate php-wasm
**File**: `packages/frontend/src/services/phpWasm.ts`
- Use `seanmorris/php-wasm` (preferred — actively maintained, better API)
- Load PHP WASM binary on page load
- Expose `runPhp(code: string): Promise<{ stdout: string, stderr: string, exitCode: number }>`
- Handle infinite loop detection with a timeout (10 seconds)
- Capture both stdout and stderr

### Task 3.2 — Multi-language execution strategy
**File**: `packages/frontend/src/services/codeRunner.ts`
- PHP: runs in browser via php-wasm (Task 3.1)
- Python: evaluate `pib` (oraoto/pib) or Pyodide as a Python-in-browser option
- Other languages (C, C++, Java, Go, Rust): send `RUN_CODE` message to backend for server-side sandboxed execution
- Unified interface: `runCode(language: string, code: string, stdin?: string): Promise<ExecutionResult>`

### Task 3.3 — Test case runner
**File**: `packages/frontend/src/services/testRunner.ts`
- For each test case: call `runCode()` with the test input piped as stdin
- Compare stdout (trimmed) with expected output
- Return per-test results: passed/failed, actual output, expected output, execution time
- Aggregate: "X/Y test cases passed"

---

## Phase 4: WebSocket Real-Time Communication

### Task 4.1 — WebSocket client hook
**File**: `packages/frontend/src/hooks/useWebSocket.ts`
- Connect to `ws://localhost:8000/ws`
- Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)
- Send `JOIN_SESSION` on connect with `{ sessionId, userId, role }`
- Message queue for offline buffering
- Expose: `sendMessage(msg)`, `lastMessage`, `connectionStatus`

### Task 4.2 — Backend WebSocket server
**File**: `packages/backend/src/WebSocket/Server.php`
- Use Ratchet (`cboden/ratchet`) PHP WebSocket library
- Room-based routing: each session is a room, max 2 participants (interviewer + interviewee)
- On `JOIN_SESSION`: add client to room, notify other participant
- On `CODE_CHANGE`: broadcast to other participants in the room
- On `CURSOR_MOVE`: broadcast cursor position to others
- On `SET_QUESTION`: forward to interviewee
- On `RUN_CODE`: if server-side execution needed, run sandboxed and send `CODE_OUTPUT` back
- Handle disconnects: notify other participant, keep session alive for 5 minutes for reconnect

### Task 4.3 — Cursor synchronization
**File**: `packages/frontend/src/hooks/useCursorSync.ts`
- On local cursor move (Monaco `onDidChangeCursorPosition`), send `CURSOR_MOVE` with `{ line, column }`
- On receiving `CURSOR_MOVE`, render a colored decoration in Monaco at that position
- Throttle outgoing cursor updates to 50ms
- Show participant name label above remote cursor

### Task 4.4 — Code synchronization with conflict resolution
**File**: `packages/frontend/src/hooks/useCodeSync.ts`
- Send incremental text changes (Monaco `onDidChangeModelContent` delta)
- Apply incoming deltas using Monaco `applyEdits`
- Use operation versioning: each change has a monotonic sequence number
- If versions diverge, the interviewer's version wins (interviewer has authority)

---

## Phase 5: Backend — REST API & Database

### Task 5.1 — SQLite database schema
**File**: `packages/backend/src/Models/schema.sql`
```sql
CREATE TABLE sessions (id TEXT PK, interviewer_id TEXT, interviewee_id TEXT, status TEXT, created_at, ended_at);
CREATE TABLE questions (id TEXT PK, session_id TEXT FK, title, description, difficulty, category, template_code JSON, test_cases JSON, evaluation_criteria JSON, sort_order INT);
CREATE TABLE evaluations (id TEXT PK, session_id TEXT FK, question_id TEXT FK, criteria_scores JSON, notes TEXT, updated_at);
CREATE TABLE chat_messages (id TEXT PK, session_id TEXT FK, user_id TEXT, role TEXT, message TEXT, created_at);
CREATE TABLE code_snapshots (id TEXT PK, session_id TEXT FK, question_id TEXT FK, language TEXT, code TEXT, created_at);
```

### Task 5.2 — Session REST endpoints
**File**: `packages/backend/src/Routes/Sessions.php`
- `POST /api/sessions` — create new session, return session ID + interviewer/interviewee URLs
- `GET /api/sessions/:id` — get session details
- `PATCH /api/sessions/:id` — update session status (start, end)
- `GET /api/sessions/:id/report` — generate final report (scores, notes, code snapshots, timeline)

### Task 5.3 — Question REST endpoints
**File**: `packages/backend/src/Routes/Questions.php`
- `POST /api/sessions/:id/questions` — add question to session
- `GET /api/sessions/:id/questions` — list questions for session
- `PUT /api/sessions/:id/questions/:qid` — update question
- `DELETE /api/sessions/:id/questions/:qid` — remove question
- `GET /api/questions/bank` — list all available questions from question bank

### Task 5.4 — Evaluation REST endpoints
**File**: `packages/backend/src/Routes/Evaluations.php`
- `PUT /api/sessions/:sid/questions/:qid/evaluation` — update evaluation scores and notes
- `GET /api/sessions/:sid/evaluations` — get all evaluations for session

---

## Phase 6: Session & State Management

### Task 6.1 — Session context
**File**: `packages/frontend/src/contexts/SessionContext.tsx`
- React context providing: `session`, `currentQuestion`, `role`, `connectionStatus`
- On mount: fetch session data from `GET /api/sessions/:id`
- On `SET_QUESTION` WS message: update `currentQuestion`
- Persist session state to localStorage for reconnect

### Task 6.2 — Editor context
**File**: `packages/frontend/src/contexts/EditorContext.tsx`
- Manage: `code`, `language`, `executionResult`, `isRunning`
- Coordinate between editor component, code runner, and WebSocket sync

### Task 6.3 — Interviewer page layout
**File**: `packages/frontend/src/pages/InterviewerPage.tsx`
- Three-column layout: Sidebar (questions + eval, ~280px) | Editor (flex) | Evaluation notes (~300px)
- Header with candidate name and timer
- Bottom: live view of candidate's code (read-only Monaco instance) OR shared editor
- Wire up all contexts and WebSocket

### Task 6.4 — Interviewee page layout
**File**: `packages/frontend/src/pages/IntervieweePage.tsx`
- Two-column layout: Sidebar (problem description, ~300px) | Editor + Output (flex)
- Header with timer and recording indicator
- Bottom: Output panel with tabs (Output, Errors) and test case results
- Footer: Chat bar with voice/video/hint controls

---

## Phase 7: Polish & Additional Features

### Task 7.1 — Question bank seed data
**File**: `packages/backend/src/Seeds/questions.json`
- 10-15 curated coding questions across categories: Arrays, Strings, Linked Lists, Trees, Dynamic Programming
- Each with: title, description, difficulty, category, template code (Python + JS), test cases, evaluation criteria

### Task 7.2 — Session report generation
**File**: `packages/backend/src/Services/ReportService.php`
- Aggregate: per-question scores, notes, total score, time spent per question
- Include final code snapshots
- Export as JSON (later: PDF)

### Task 7.3 — Responsive design
- Mobile/tablet breakpoints following `jotform-theme.css` patterns
- Collapsible sidebar on smaller screens
- Touch-friendly controls

### Task 7.4 — Keyboard shortcuts
- `Ctrl+Enter` / `Cmd+Enter`: Run code
- `Ctrl+S` / `Cmd+S`: Save snapshot
- `Ctrl+Shift+T`: Toggle between Output/Errors tabs

---

## Implementation Order (Suggested)

1. **Phase 1** — Shared types + scaffolding (foundation)
2. **Phase 2.1–2.4** — Header, Sidebars, Editor (visual shell)
3. **Phase 3.1** — PHP-WASM integration (core value prop)
4. **Phase 2.5–2.6** — Toolbar + Output panel (complete single-user flow)
5. **Phase 4.1–4.2** — WebSocket client + server (enable real-time)
6. **Phase 4.3–4.4** — Cursor + code sync (collaborative editing)
7. **Phase 5** — REST API + database (persistence)
8. **Phase 6** — State management + page layouts (full integration)
9. **Phase 3.2–3.3** — Multi-language + test runner (extend execution)
10. **Phase 7** — Polish, seed data, reports

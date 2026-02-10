# Interview Platform - Implementation Roadmap

> **Version**: 2.0
> **Last Updated**: 2026-02-05
> **Stack**: React 18 + Vite + Monaco | PHP REST + Ratchet WebSocket | SQLite

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Developer Assignments](#developer-assignments)
4. [Phase 0: Protocol & Type Contracts](#phase-0-protocol--type-contracts)
5. [Phase 1: Question Visibility & Candidate Navigation](#phase-1-question-visibility--candidate-navigation)
6. [Phase 2: Multi-File Editor Support](#phase-2-multi-file-editor-support)
7. [Phase 3: Question Metadata (Levels & Kinds)](#phase-3-question-metadata-levels--kinds)
8. [Phase 4: Admin Panel](#phase-4-admin-panel)
9. [Phase 5: Superadmin Panel & Interviewer Assignment](#phase-5-superadmin-panel--interviewer-assignment)
10. [Phase 6: Drawing Board (Whiteboard)](#phase-6-drawing-board-whiteboard)
11. [Phase 7: Report System & Export](#phase-7-report-system--export)
12. [Phase 8: cURL Polyfill / Remote Execution](#phase-8-curl-polyfill--remote-execution)
13. [Phase 9: Enhanced Editor Features](#phase-9-enhanced-editor-features)
14. [Parallel Execution Timeline](#parallel-execution-timeline)
15. [Database Schema Changes](#database-schema-changes)
16. [Acceptance Criteria Checklists](#acceptance-criteria-checklists)

---

## Executive Summary

### Features to Implement

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| 1 | Multi-file support (tabs, not folder tree) | High | High |
| 2 | Hide questions from candidate (only show current + prev arrow) | High | Medium |
| 3 | Admin Panel (question bank management) | High | High |
| 4 | Question levels: intern/junior/senior/present | Medium | Low |
| 5 | Drawing board (real-time whiteboard) | Medium | High |
| 6 | Superadmin panel (interviewer assignment) | Medium | Medium |
| 7 | Report system with exports (HTML/Sheets/PDF) | High | Medium |
| 8 | Syntax highlighting improvements | Low | Low |
| 9 | Auto-complete enhancements | Low | Medium |
| 10 | cURL polyfill for PHP-WASM | Low | High |
| 11 | Move question bank from interviewer sidebar to admin | High | Medium |

### Key Decisions

- **Multi-file**: Tab-based UI (no folder tree)
- **Question levels**: `intern` | `junior` | `senior` with `kind`: `coding` | `present`
- **Whiteboard**: Using tldraw library with real-time sync
- **Admin auth**: Simple `X-Admin-Key` header (can upgrade to login later)
- **WebSocket**: Keep Ratchet (PHP) for now, Node migration optional later

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INTERVIEW PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐         ┌─────────────────────────────┐    │
│  │   FRONTEND (React)      │         │   BACKEND (PHP)             │    │
│  ├─────────────────────────┤         ├─────────────────────────────┤    │
│  │ /interview/:token       │ REST    │ /api/sessions/*             │    │
│  │ /admin/*                │◄───────►│ /api/questions/*            │    │
│  │                         │ :8000   │ /api/admin/*                │    │
│  │ Components:             │         │ /api/superadmin/*           │    │
│  │ - ProjectEditor (tabs)  │         │                             │    │
│  │ - Whiteboard (tldraw)   │ WS      │ WebSocket Server            │    │
│  │ - AdminLayout           │◄───────►│ - ConnectionManager         │    │
│  │                         │ :8080   │ - MessageHandler            │    │
│  │ Services:               │         │                             │    │
│  │ - phpWasm.ts            │         │ Services:                   │    │
│  │ - executionProvider.ts  │         │ - AuthService               │    │
│  │ - reportExport.ts       │         │ - ReportService             │    │
│  │                         │         │ - WhiteboardService         │    │
│  └─────────────────────────┘         └─────────────────────────────┘    │
│                                                   │                      │
│                                      ┌────────────▼────────────┐        │
│                                      │   SQLite Database       │        │
│                                      ├─────────────────────────┤        │
│                                      │ sessions, tokens, users │        │
│                                      │ questions, evaluations  │        │
│                                      │ code_snapshots          │        │
│                                      │ whiteboard_snapshots    │        │
│                                      └─────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Developer Assignments

### Dev-A (Backend Developer)
**Focus**: PHP REST API, WebSocket handlers, Database, Services

**Responsibilities**:
- Database schema migrations
- REST API endpoints (Admin, Superadmin, Reports)
- WebSocket message handlers
- Authentication & authorization services
- Report generation logic

### Dev-B (Frontend Developer)
**Focus**: React UI, Monaco Editor, State Management, Real-time Sync

**Responsibilities**:
- Multi-file editor component
- Admin panel pages
- Whiteboard integration (tldraw)
- Report export utilities
- PHP-WASM enhancements

### Sync Points (Both Developers)
- Phase 0: Type contracts in `packages/shared/src/index.ts`
- Phase 2: `CODE_CHANGE` payload format
- Phase 5: Report DTO schema
- Phase 6: Whiteboard event format

---

## Phase 0: Protocol & Type Contracts

> **Goal**: Define all shared types and message formats BEFORE implementation
> **Duration**: 1 day
> **Blocking**: All other phases depend on this

### Dev-B Tasks

#### F0.1 — Update Shared Types

**File**: `packages/shared/src/index.ts`

```typescript
// ============ NEW TYPES ============

/** Question levels for categorization */
export type QuestionLevel = 'intern' | 'junior' | 'senior';

/** Question kinds */
export type QuestionKind = 'coding' | 'present';

/** Multi-file project representation */
export type ProjectFiles = Record<string, string>;

/** Active question payload sent to candidate (no hidden tests) */
export interface ActiveQuestionPayload {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  level: QuestionLevel;
  kind: QuestionKind;
  templateCode: ProjectFiles;
  visibleTestCases: TestCase[];
  evaluationCriteria: EvaluationCriterion[];
}

/** CODE_CHANGE payload for multi-file support */
export interface CodeChangePayload {
  files: ProjectFiles;
  activeFile: string;
  cursorPosition?: { line: number; column: number };
}

/** Whiteboard patch message */
export interface WhiteboardPatchPayload {
  changes: unknown[];
  clientId: string;
  baseVersion?: number;
}

/** Report DTO for export */
export interface ReportDto {
  session: {
    id: string;
    candidateName: string;
    interviewerName: string;
    status: SessionStatus;
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number | null;
  };
  questions: Array<{
    id: string;
    title: string;
    level: QuestionLevel;
    kind: QuestionKind;
    difficulty: string;
    evaluation: {
      criteriaScores: Record<string, number>;
      notes: string;
    } | null;
    lastSubmission: {
      files: ProjectFiles;
      submittedAt: string;
    } | null;
  }>;
  whiteboardSnapshot: {
    base64Png: string;
    width: number;
    height: number;
  } | null;
}

/** User roles */
export type UserRole = 'interviewer' | 'admin' | 'superadmin';

/** Add to WSMessageType enum */
export enum WSMessageType {
  // ... existing types ...
  NAVIGATE_QUESTION = 'navigate_question',
  WHITEBOARD_INIT = 'whiteboard_init',
  WHITEBOARD_PATCH = 'whiteboard_patch',
  WHITEBOARD_SNAPSHOT = 'whiteboard_snapshot',
}
```

### Acceptance Criteria
- [ ] All new types defined in `packages/shared/src/index.ts`
- [ ] TypeScript compiles without errors
- [ ] Both developers agree on payload formats

---

## Phase 1: Question Visibility & Candidate Navigation

> **Goal**: Candidate cannot see the question list; only current question + prev arrow
> **Duration**: 2-3 days

### Dev-A Tasks

#### B1.1 — Create AuthService

**File**: `packages/backend/src/Services/AuthService.php` (new)

**Functions**:
- `getBearerToken(): ?string` — Extract Bearer token from Authorization header
- `resolveSessionRoleFromBearer(): ?array` — Returns `{session_id, role, user_id}`
- `requireRoles(?array $resolved, array $allowedRoles): void` — 403 if not matched
- `requireAdmin(): void` — Check X-Admin-Key header against env var

#### B1.2 — Protect Question Bank Endpoint

**File**: `packages/backend/src/Routes/QuestionRoutes.php`

**Logic**:
- `GET /api/questions/bank` → require role `interviewer|admin|superadmin`
- Candidate token returns 403
- Candidate receives question via WebSocket `SET_QUESTION` message only

#### B1.3 — Enrich SET_QUESTION Message

**File**: `packages/backend/src/WebSocket/MessageHandler.php`

**Logic**:
- When interviewer sends SET_QUESTION, server fetches full question from DB
- Filters out hidden test cases
- Broadcasts enriched payload to candidate

#### B1.4 — Server-side Navigation Enforcement

**File**: `packages/backend/src/Services/SessionQuestionService.php` (new)

**Functions**:
- `getOrderedQuestionIds(string $sessionId): array`
- `getPrevQuestionId(string $sessionId, string $currentId): ?string`
- `getNextQuestionId(string $sessionId, string $currentId): ?string`

**WebSocket Handler**:
- `handleNavigateQuestion` — candidate can only request `direction: 'prev'`

### Dev-B Tasks

#### F1.1 — Remove Question Bank Fetch from Candidate

**File**: `packages/frontend/src/pages/IntervieweePage.tsx`

**Changes**:
- Remove `fetchQuestionBank()` call
- Add state: `activeQuestion: ActiveQuestionPayload | null`
- Listen for `SET_QUESTION` from WebSocket

#### F1.2 — Update IntervieweeSidebar

**File**: `packages/frontend/src/components/Sidebar/IntervieweeSidebar.tsx`

**Props**:
```typescript
interface IntervieweeSidebarProps {
  question: ActiveQuestionPayload | null;
  navPermission: 'none' | 'prev_only' | 'both';
  onNavigate: (direction: 'prev' | 'next') => void;
}
```

**UI Changes**:
- Show only "Previous" button (no "Next" for candidate)
- Display question title, description, difficulty, visible test cases
- No question list visible

#### F1.3 — Update useCodeSync Hook

**File**: `packages/frontend/src/hooks/useCodeSync.ts`

**Add function**:
```typescript
navigateQuestion(direction: 'prev' | 'next', currentQuestionId: string): void
```

### Acceptance Criteria
- [ ] Candidate cannot fetch `/api/questions/bank` (403)
- [ ] Candidate sees only current question content
- [ ] Candidate only has "Previous" button (no "Next")
- [ ] Navigation is enforced server-side

---

## Phase 2: Multi-File Editor Support

> **Goal**: Support multiple files with tabs (no folder tree)
> **Duration**: 4-6 days

### Dev-A Tasks

#### B2.1 — Update Database Schema

**File**: `packages/backend/database/schema.sql`

```sql
ALTER TABLE code_snapshots ADD COLUMN files_json TEXT;
ALTER TABLE code_snapshots ADD COLUMN entry_file TEXT DEFAULT 'solution.php';
ALTER TABLE code_snapshots ADD COLUMN active_file TEXT DEFAULT 'solution.php';
ALTER TABLE questions ADD COLUMN template_files_json TEXT;
```

#### B2.2 — Update CodeSnapshot Model

**File**: `packages/backend/src/Models/CodeSnapshot.php`

**New function**:
```php
public function createProject(
    string $sessionId,
    string $questionId,
    array $files,
    bool $isSubmission = false,
    string $entryFile = 'solution.php',
    string $activeFile = 'solution.php'
): string
```

**Validations**:
- Max 10 files
- Max 200KB total size
- File names: alphanumeric + underscore + .php extension

#### B2.3 — Update WebSocket CODE_CHANGE Handler

**File**: `packages/backend/src/WebSocket/MessageHandler.php`

**New payload format**:
```php
[
    'files' => ['solution.php' => '...', 'helpers.php' => '...'],
    'activeFile' => 'solution.php',
    'cursorPosition' => ['line' => 1, 'column' => 1]
]
```

### Dev-B Tasks

#### F2.1 — Update EditorContext for Multi-File

**File**: `packages/frontend/src/contexts/EditorContext.tsx`

**New state**:
```typescript
interface EditorState {
  files: ProjectFiles;
  activeFile: string;
  entryFile: string;
  // ...existing fields
}
```

**New functions**:
- `setFiles(files: ProjectFiles): void`
- `setActiveFile(name: string): void`
- `updateFile(name: string, content: string): void`
- `addFile(name: string, content?: string): void`
- `deleteFile(name: string): void`
- `renameFile(oldName: string, newName: string): void`

#### F2.2 — Create ProjectEditor Component

**File**: `packages/frontend/src/components/Editor/ProjectEditor.tsx` (new)

**Props**:
```typescript
interface ProjectEditorProps {
  files: ProjectFiles;
  activeFile: string;
  readOnly?: boolean;
  onChange: (files: ProjectFiles, activeFile: string) => void;
  onActiveFileChange: (name: string) => void;
  onAddFile: () => void;
  onDeleteFile: (name: string) => void;
}
```

**Features**:
- Tab bar with file names
- Close button on tabs (except entry file)
- "+" button to add new file
- Monaco editor for active file

#### F2.3 — Update PHP-WASM for Multi-File

**File**: `packages/frontend/src/services/phpWasm.ts`

**New function**:
```typescript
async function runPhpProject(
  files: ProjectFiles,
  entryFile: string = 'solution.php',
  stdin?: string,
  timeoutMs: number = 10000
): Promise<PhpRunResult>
```

**Logic**:
- Write all files to virtual filesystem
- Set working directory to /tmp
- Run entry file

#### F2.4 — Update useCodeSync for Multi-File

**File**: `packages/frontend/src/hooks/useCodeSync.ts`

**Changes**:
- `sendCodeChange(payload: CodeChangePayload, questionId: string): void`
- `submitCode(files: ProjectFiles, questionId: string, entryFile: string): void`

### Acceptance Criteria
- [ ] Editor shows tabs for multiple files
- [ ] Can add new files (max 10)
- [ ] Can delete files (except entry file)
- [ ] Code changes sync between interviewer and candidate
- [ ] Code snapshots store all files as JSON
- [ ] PHP-WASM can run multi-file projects

---

## Phase 3: Question Metadata (Levels & Kinds)

> **Goal**: Add `level` (intern/junior/senior) and `kind` (coding/present) to questions
> **Duration**: 1-2 days

### Dev-A Tasks

#### B3.1 — Update Questions Table

**File**: `packages/backend/database/schema.sql`

```sql
ALTER TABLE questions ADD COLUMN level TEXT NOT NULL DEFAULT 'junior'
    CHECK(level IN ('intern', 'junior', 'senior'));
ALTER TABLE questions ADD COLUMN kind TEXT NOT NULL DEFAULT 'coding'
    CHECK(kind IN ('coding', 'present'));
```

#### B3.2 — Update Question Model

**File**: `packages/backend/src/Models/Question.php`

**Update functions**:
- `create(array $data): string` — include level, kind
- `update(string $id, array $data): void` — allow updating level, kind
- `findByFilters(array $filters): array` — filter by level, kind, difficulty, search

### Dev-B Tasks

#### F3.1 — Update InterviewerSidebar with Filters

**File**: `packages/frontend/src/components/Sidebar/InterviewerSidebar.tsx`

**Add**:
- `levelFilter: QuestionLevel | 'all'` state
- `kindFilter: QuestionKind | 'all'` state
- Filter dropdowns in UI
- Display level/kind badges on question cards

### Acceptance Criteria
- [ ] Questions have `level` and `kind` fields
- [ ] Interviewer can filter questions by level/kind
- [ ] Question metadata visible in question card

---
## Phase 4: Admin Panel

> **Goal**: Move question bank management to dedicated admin panel
> **Duration**: 3-5 days

### Dev-A Tasks

#### B4.1 — Create Admin Routes

**File**: `packages/backend/src/Routes/AdminRoutes.php` (new)

**Endpoints**:
- `GET /api/admin/questions?level=&kind=&difficulty=&q=` — List with filters
- `POST /api/admin/questions` — Create question
- `PUT /api/admin/questions/:id` — Update question
- `DELETE /api/admin/questions/:id` — Delete question
- `GET /api/admin/sessions` — List all sessions

**Auth**: All require `X-Admin-Key` header

#### B4.2 — Register Admin Routes

**File**: `packages/backend/public/index.php`

Add: `AdminRoutes::register($router);`

### Dev-B Tasks

#### F4.1 — Create Admin Layout and Routing

**File**: `packages/frontend/src/App.tsx`

**Add routes**:
```typescript
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<Navigate to="/admin/questions" replace />} />
  <Route path="questions" element={<QuestionBankPage />} />
  <Route path="sessions" element={<SessionsPage />} />
  <Route path="sessions/:id/report" element={<SessionReportPage />} />
  <Route path="assign" element={<SuperadminAssignPage />} />
</Route>
```

#### F4.2 — Create AdminLayout Component

**File**: `packages/frontend/src/pages/admin/AdminLayout.tsx` (new)

**Features**:
- Admin key input for authentication
- Sidebar navigation
- Logout button
- Outlet for child routes

#### F4.3 — Create QuestionBankPage

**File**: `packages/frontend/src/pages/admin/QuestionBankPage.tsx` (new)

**Features**:
- Question list table with columns: Title, Level, Kind, Difficulty, Category, Actions
- Filters: level, kind, difficulty, search
- Create/Edit modal with form
- Delete confirmation

#### F4.4 — Remove Question Bank from InterviewerSidebar

**File**: `packages/frontend/src/components/Sidebar/InterviewerSidebar.tsx`

- Remove question bank management section
- Keep question selection list (read-only)

### Acceptance Criteria
- [ ] Admin can access `/admin` with admin key
- [ ] Question bank CRUD works in admin panel
- [ ] Question bank section removed from interviewer sidebar
- [ ] Interviewer can still select questions from list

---

## Phase 5: Superadmin Panel & Interviewer Assignment

> **Goal**: Superadmin can create sessions and assign interviewers
> **Duration**: 2-3 days

### Dev-A Tasks

#### B5.1 — Create Users Table

**File**: `packages/backend/database/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('interviewer', 'admin', 'superadmin')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sessions ADD COLUMN interviewer_user_id TEXT REFERENCES users(id);
ALTER TABLE sessions ADD COLUMN candidate_name TEXT;
```

#### B5.2 — Create Superadmin Routes

**File**: `packages/backend/src/Routes/SuperAdminRoutes.php` (new)

**Endpoints**:
- `GET /api/superadmin/interviewers` — List available interviewers
- `POST /api/superadmin/interviewers` — Create interviewer account
- `POST /api/superadmin/sessions` — Create session with interviewer assignment

### Dev-B Tasks

#### F5.1 — Create SuperadminAssignPage

**File**: `packages/frontend/src/pages/admin/SuperadminAssignPage.tsx` (new)

**Features**:
- Interviewer dropdown
- Candidate name input
- Create Session button
- Display generated links (interviewer + candidate) with copy buttons

### Acceptance Criteria
- [ ] Superadmin can see list of interviewers
- [ ] Superadmin can create new interviewer accounts
- [ ] Superadmin can create session with interviewer assignment
- [ ] Generated links are copyable

---

## Phase 6: Drawing Board (Whiteboard)

> **Goal**: Real-time collaborative whiteboard using tldraw
> **Duration**: 4-6 days

### Dev-B Tasks (Primary)

#### F6.1 — Install tldraw

```bash
cd packages/frontend
npm install tldraw @tldraw/sync
```

#### F6.2 — Create Whiteboard Component

**File**: `packages/frontend/src/components/Whiteboard/Whiteboard.tsx` (new)

**Props**:
```typescript
interface WhiteboardProps {
  sessionId: string;
  userId: string;
  ws: WebSocket | null;
  readOnly?: boolean;
}
```

**Logic**:
- Mount tldraw editor
- Listen for local store changes, send via WebSocket
- Apply remote changes from WebSocket
- Handle WHITEBOARD_INIT for loading saved state

#### F6.3 — Export Function for Reports

```typescript
async function exportWhiteboardPng(editor: Editor): Promise<{
  base64: string;
  width: number;
  height: number;
}>
```

### Dev-A Tasks

#### B6.1 — Add Whiteboard Message Handlers

**File**: `packages/backend/src/WebSocket/MessageHandler.php`

**New cases**:
- `whiteboard_patch` — broadcast to room
- `whiteboard_snapshot` — save to database

#### B6.2 — Create WhiteboardService

**File**: `packages/backend/src/Services/WhiteboardService.php` (new)

**Functions**:
- `saveSnapshot(string $sessionId, string $base64Png, int $width, int $height): void`
- `getSnapshot(string $sessionId): ?array`

#### B6.3 — Add Whiteboard Table

**File**: `packages/backend/database/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS whiteboard_snapshots (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    png_base64 TEXT NOT NULL,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Acceptance Criteria
- [ ] Whiteboard renders with tldraw
- [ ] Drawing syncs between interviewer and candidate in real-time
- [ ] Whiteboard can be toggled on/off
- [ ] Whiteboard snapshot saved for reports

---

## Phase 7: Report System & Export

> **Goal**: Generate reports with HTML table, Google Sheets, and PDF exports
> **Duration**: 3-4 days

### Dev-A Tasks

#### B7.1 — Implement ReportService

**File**: `packages/backend/src/Services/ReportService.php`

**Function**:
```php
public function generate(string $sessionId): array
```

**Returns ReportDto** with:
- Session info (candidate, interviewer, duration, status)
- Questions with evaluations and last submissions
- Whiteboard snapshot if exists

#### B7.2 — Add Report Endpoint

**File**: `packages/backend/src/Routes/SessionRoutes.php`

**Endpoint**: `GET /api/sessions/:id/report`

### Dev-B Tasks

#### F7.1 — Create Report Export Utilities

**File**: `packages/frontend/src/services/reportExport.ts` (new)

**Functions**:
- `reportToHtmlTable(report: ReportDto): string` — HTML table for email
- `reportToTsv(report: ReportDto): string` — TSV for Google Sheets
- `copyToClipboard(text: string, mimeType?: string): Promise<void>`
- `downloadAsPdf(report: ReportDto): void` — Opens print dialog

#### F7.2 — Create SessionReportPage

**File**: `packages/frontend/src/pages/admin/SessionReportPage.tsx` (new)

**Features**:
- Summary cards (candidate, interviewer, duration, status)
- Question sections with evaluation scores and notes
- Code submission preview
- Whiteboard snapshot image
- Export toolbar: Copy HTML, Copy TSV, Download PDF

### Acceptance Criteria
- [ ] Report endpoint returns complete session data
- [ ] HTML table can be copied for email
- [ ] TSV can be copied for Google Sheets
- [ ] PDF can be downloaded (via print)
- [ ] Whiteboard snapshot included in report

---

## Phase 8: cURL Polyfill / Remote Execution

> **Goal**: Allow candidates to use HTTP functions in PHP
> **Duration**: 3-5 days (optional phase)

### Option A: Pure PHP Polyfill (Frontend)

**File**: `packages/frontend/public/curlPolyfill.php`

Create PHP file that simulates curl_* functions using PHP streams (file_get_contents with stream_context_create).

**Injected** before user code runs in PHP-WASM.

### Option B: Remote Runner (Backend)

**File**: `packages/backend/src/Services/ExecutionService.php` (new)

**Function**:
```php
public function runProject(
    string $filesJson,
    string $entryFile,
    ?string $stdin
): array
```

**Security**:
- Disable dangerous functions
- Memory limit: 64MB
- Time limit: 10 seconds
- Temp directory cleanup

### Acceptance Criteria
- [ ] Basic cURL functions work in PHP-WASM (polyfill)
- [ ] Security: dangerous functions disabled
- [ ] Timeouts enforced

---

## Phase 9: Enhanced Editor Features

> **Goal**: Improve syntax highlighting and auto-complete
> **Duration**: 1-2 days

### Dev-B Tasks

#### F9.1 — Enhance PHP IntelliSense

**File**: `packages/frontend/src/services/monacoPhpIntellisense.ts`

**Add**:
- More PHP built-in functions (array_*, string functions, etc.)
- Function signatures for hover documentation
- Code snippets (foreach, function, class, try/catch)

### Acceptance Criteria
- [ ] More PHP functions autocomplete
- [ ] Function signatures shown on hover
- [ ] Code snippets available

---

## Parallel Execution Timeline

```
Week 1:
├── Dev-A: Phase 0 (types) → Phase 1 (auth, WS)
├── Dev-B: Phase 0 (types) → Phase 1 (candidate UI)
└── Sync: Agree on ActiveQuestionPayload format

Week 2:
├── Dev-A: Phase 2 (DB schema, snapshot model)
├── Dev-B: Phase 2 (ProjectEditor, EditorContext)
└── Sync: Agree on CODE_CHANGE payload format

Week 3:
├── Dev-A: Phase 3 (question metadata) → Phase 4 (admin routes)
├── Dev-B: Phase 3 (filters) → Phase 4 (admin UI)
└── Sync: Test admin panel integration

Week 4:
├── Dev-A: Phase 5 (superadmin) → Phase 6 (WS whiteboard)
├── Dev-B: Phase 5 (assign UI) → Phase 6 (tldraw integration)
└── Sync: Test whiteboard sync

Week 5:
├── Dev-A: Phase 7 (ReportService)
├── Dev-B: Phase 7 (report UI, exports)
└── Sync: Test full report flow

Week 6 (optional):
├── Dev-A: Phase 8 (remote runner if needed)
├── Dev-B: Phase 8 (curl polyfill) → Phase 9 (editor improvements)
└── Final integration testing
```

---

## Database Schema Changes

**Complete migration script**:

```sql
-- Phase 2: Multi-file support
ALTER TABLE code_snapshots ADD COLUMN files_json TEXT;
ALTER TABLE code_snapshots ADD COLUMN entry_file TEXT DEFAULT 'solution.php';
ALTER TABLE code_snapshots ADD COLUMN active_file TEXT DEFAULT 'solution.php';
ALTER TABLE questions ADD COLUMN template_files_json TEXT;

-- Phase 3: Question metadata
ALTER TABLE questions ADD COLUMN level TEXT NOT NULL DEFAULT 'junior'
    CHECK(level IN ('intern', 'junior', 'senior'));
ALTER TABLE questions ADD COLUMN kind TEXT NOT NULL DEFAULT 'coding'
    CHECK(kind IN ('coding', 'present'));

-- Phase 5: Users and assignment
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('interviewer', 'admin', 'superadmin')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sessions ADD COLUMN interviewer_user_id TEXT REFERENCES users(id);
ALTER TABLE sessions ADD COLUMN candidate_name TEXT;

-- Phase 6: Whiteboard
CREATE TABLE IF NOT EXISTS whiteboard_snapshots (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    png_base64 TEXT NOT NULL,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

---

## Acceptance Criteria Checklists

### Phase 1 Complete When:
- [ ] Candidate cannot access `/api/questions/bank`
- [ ] Candidate receives question via WebSocket only
- [ ] Candidate sees only "Previous" navigation button
- [ ] Server enforces navigation rules

### Phase 2 Complete When:
- [ ] Editor supports multiple file tabs
- [ ] Files sync between interviewer and candidate
- [ ] PHP-WASM runs multi-file projects
- [ ] Snapshots store all files

### Phase 3 Complete When:
- [ ] Questions have level and kind fields
- [ ] Interviewer can filter questions
- [ ] Metadata visible in UI

### Phase 4 Complete When:
- [ ] Admin panel accessible at `/admin`
- [ ] Question bank CRUD works
- [ ] Question bank removed from interviewer sidebar

### Phase 5 Complete When:
- [ ] Interviewers can be created
- [ ] Sessions can be assigned to interviewers
- [ ] Links are generated and copyable

### Phase 6 Complete When:
- [ ] Whiteboard renders and is usable
- [ ] Drawing syncs in real-time
- [ ] Snapshot saved for reports

### Phase 7 Complete When:
- [ ] Report endpoint returns complete data
- [ ] HTML/TSV/PDF exports work
- [ ] Whiteboard in report

---

## Figma AI Design Prompts

### 1. Admin — Question Bank Page
```
Design a responsive Admin Question Bank page for a coding interview platform.
Left sidebar navigation (Questions, Sessions, Superadmin).
Top header with filter row (Level: Intern/Junior/Senior, Kind: Coding/Present, Difficulty, Search).
Table list with columns: Title, Level, Kind, Difficulty, Category, Updated, Actions.
Right side drawer modal for Create/Edit Question.
Primary button in orange, clean spacing, light gray background, navy header.
```

### 2. Superadmin — Interviewer Assignment
```
Design a Superadmin Session Creation page. Form card: Candidate name, select Interviewer
dropdown, Create Session button. After creation show two copyable links (Interviewer link,
Candidate link) with Copy buttons. Include recent assignments list. Minimal, professional.
```

### 3. Admin — Sessions List
```
Design an Admin Sessions page with a sortable table: Session ID, Candidate name, Interviewer,
Status (waiting/active/ended), Started at, Ended at, Report button. Include filters for
status and date range.
```

### 4. Admin — Report View
```
Design a Session Report page: summary cards (Candidate, Interviewer, Duration, Status),
sections per question (title, level/kind, notes, criteria scores as bar chart), code snippet
preview, Whiteboard snapshot image. Export toolbar: Copy HTML Table, Copy Google Sheets,
Download PDF.
```

### 5. Interviewer — Updated Layout
```
Design an Interviewer live interview page: three columns: left (question list with level/kind
badges + evaluation sliders), center (multi-file code editor with tabs), right (run output +
checklist + session controls). No question bank management section.
```

### 6. Candidate — Simplified View
```
Design a Candidate interview page: left panel shows only the current question (title,
difficulty, description, visible examples). No list of questions. Single Previous arrow
button at top. Center: multi-file code editor tabs + Run/Submit. Bottom: output panel.
Clean, focused.
```

---

*End of Implementation Roadmap*

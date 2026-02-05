# Phase 1 — Protokol & Tip Sözleşmesi (1 gün)
  Bu faz bitmeden kimse UI/WS’yi büyütmesin; önce sözleşmeyi kilitleyin.
  ### Dev-A (Backend) — WS/REST payload sözleşmesi

  - Dosya: packages/backend/src/WebSocket/MessageHandler.php
  - Kararlar:
      - SET_QUESTION artık candidate’e tam soru payload’ı taşıyacak (bank fetch yok).
  ### Dev-B (Frontend) — shared types

  - Dosya: packages/shared/src/index.ts
  - Ekle/temizle:
      - Yeni tipler:
          - export type ActiveQuestionPayload = { id: string; title: string; description: string; difficulty: 'easy'|'medium'|'hard'; level:
            string; };
  - Kabul kriteri:

  ———

  # Phase 2 — Soru Görünürlüğü & Candidate Navigasyon Kuralı (1–2 gün)

  ## Dev-A (Backend)



      - public function getBearerToken(): ?string
      - public function resolveSessionRoleFromBearer(): ?array → TokenService::resolveToken()
      - public function requireRoles(array $resolved, array $allowedRoles): void → değilse 403
      - public function requireAdmin(): void (X-Admin-Key)

  ### B2.2 — Question bank endpoint’lerini role bazlı ayır

  - Dosya: packages/backend/src/Routes/QuestionRoutes.php
      - GET /api/questions/bank → admin/interviewer only
      - (Candidate’e özel bank endpoint açma; candidate soru payload’ını WS’den alacak)

  ### B2.3 — Candidate nav enforcement (server-side)

  - Dosya: packages/backend/src/WebSocket/MessageHandler.php
      - NAVIGATE_QUESTION payload { direction: 'prev' }
      - Candidate sadece {direction:'prev'} gönderebilir.
  - Gerekli servis:
      - Dosya: packages/backend/src/Services/SessionQuestionService.php (yeni)
          - public function getOrderedQuestionIds(string $sessionId): array
          - public function getPrevQuestionId(string $sessionId, string $currentQuestionId): ?string
  ## Dev-B (Frontend)
  ### F2.1 — Interviewee bank fetch’i kaldır, sadece active question göster

  - Dosya: packages/frontend/src/pages/IntervieweePage.tsx
      - fetchQuestionBank() tamamen kalkar.
      - WS’den SET_QUESTION gelince activeQuestion set edilir.

  ### F2.2 — IntervieweeSidebar: liste yok, oklar var
  - Dosya: packages/frontend/src/components/Sidebar/IntervieweeSidebar.tsx
          - question: ActiveQuestionPayload | null
      - UI:
          - “Next” hiç yok (veya disabled + görünmez)
  Kabul kriteri:
  - Candidate hiçbir şekilde soru başlıklarını/ID’leri liste halinde göremiyor.

  ———

  # Phase 3 — Admin Panel (Question Bank taşınması) + Metadata (2–4 gün)

  ## Dev-A (Backend)



  - Dosya: packages/backend/database/schema.sql
      - questions.level TEXT NOT NULL CHECK(level IN ('intern','junior','senior'))
      - questions.kind TEXT NOT NULL CHECK(kind IN ('coding','present'))
  - Dosya: packages/backend/src/Models/Question.php
      - public function create(array $data): string
      - public function update(string $id, array $data): void



      - GET /api/admin/questions?level=&kind=&difficulty=&q= → list
      - POST /api/admin/questions
      - PUT /api/admin/questions/:id
  - Dosya: packages/backend/public/index.php → AdminRoutes::register($router) eklenir (auth guard ile).

  ## Dev-B (Frontend)

  ### F3.1 — Admin UI iskeleti
  - Dosya: packages/frontend/src/App.tsx
  - Yeni dosyalar:
      - packages/frontend/src/pages/admin/AdminLayout.tsx
  - QuestionBankPage içerik:
      - soru formu: title/desc/template_code/visible examples/hidden tests/eval criteria/level/kind



      - Sol alttaki bank alanı kalkar; onun yerine admin panel linki (sadece admin) veya hiç.
  Kabul kriteri:
  - Bank yönetimi interviewer ekranında değil, /admin altında.

  ———

  # Phase 4 — Superadmin Panel: Interviewer Atama + Session oluşturma (2–3 gün)

  ## Dev-A (Backend)

  ### B4.1 — interviewer listesi + session assignment

      - GET /api/superadmin/interviewers
          - session oluştur
          - tokens üret
          - session’a interviewer_user_id yaz
  - DB ekleri:
      - sessions.interviewer_user_id

  - Yeni dosya: packages/frontend/src/pages/admin/SuperadminAssignPage.tsx
      - candidate adı







  # Phase 5 — Multi-file Editor (tabs) + Sync + Snapshot (3–6 gün)

  > Klasör ağacı yok; sadece tabs.

  ## Dev-B (Frontend) (ana iş yükü burada)

  ### F5.1 — Project state
  - Dosya: packages/frontend/src/contexts/EditorContext.tsx
      - currentQuestionId ile birlikte activeFile
          - handleFilesChange(files: ProjectFiles, activeFile: string): void (debounce + WS)
          - handleAddFile(name: string): void (max file sayısı)
          - handleDeleteFile(name: string): void (entry file korunur)
  ### F5.2 — Monaco multi-model tabs component

  - Yeni dosya: packages/frontend/src/components/Editor/ProjectEditor.tsx
      - function ProjectEditor(props: { files: ProjectFiles; activeFile: string; readOnly?: boolean; onChange: (...)=>void; onActiveFileChange:
      - Mantık: her dosya için Monaco model + tab bar
  ### F5.3 — WS message payload güncelle
  - Dosyalar:
      - packages/frontend/src/hooks/useCodeSync.ts
      - packages/shared/src/index.ts



  - Dosya: packages/backend/src/Models/CodeSnapshot.php
  - Dosya: packages/backend/database/schema.sql migration yaklaşımı (dev ortamı için “drop+init” yeterli olabilir)
  Kabul kriteri:
  - Interviewer ve candidate aynı anda multi-file editörü senkron görüyor.









  - Network yoksa / saf PHP ise: hızlı.

  ## Mod B: Remote Runner (server-side) — curl/ffi/extension gerektiğinde

  - “curl kodu var” veya “network lazım” ise: backend’e gönder, backend sandbox içinde koşar.

  ### Dev-A (Backend) — Remote runner tasarımı

  - Yeni dosya: packages/backend/src/Services/ExecutionService.php
      - public function runProject(string $sessionId, string $questionId, string $filesJson, string $entryFile, array $opts): array
      - Whitelist: packages/backend/config/egress_whitelist.json (yeni)
          - packages/backend/src/Services/EgressProxyService.php
              - public function fetch(string $url, string $method, array $headers, string $body): array
              - Host allowlist + DNS rebinding koruması + timeout + max bytes
  - Runner implementasyonu (plan):
      - Basit MVP: PHP CLI + disable dangerous functions + time limit
      - Eğer extension şartsa: ayrı binary/container profili (burada senin “vrzno gibi bir şey” devreye girer)
  ### Dev-B (Frontend) — ExecutionProvider seçimi
  - Yeni dosya: packages/frontend/src/services/executionProvider.ts
      - export type ExecutionMode = 'local_wasm' | 'remote_runner';
  - UI:
          - basit heuristic: curl_ / FFI / extension_loaded('curl') string match → remote öner

  - Remote runner timeouts + output limitleri ile UI’yi kilitlemez.
  Not: Burada 2 soru daha var (cevaplarsan bu fazı daha net atomik bölerim):
  1. Remote runner’ı aynı makinede PHP CLI ile mi koşacağız, yoksa “ayrı servis/container” mı?
  2. Whitelist formatı: domain bazlı mı (*.example.com) yoksa tam URL pattern mi?

  ———





  - Yeni dosyalar:
      - packages/frontend/src/components/Whiteboard/Whiteboard.tsx
      - packages/frontend/src/hooks/useWhiteboardSync.ts
  - Export:
      - export function exportWhiteboardPng(): string (base64 png)
  ## Dev-A (Backend)
  - WS:
      - Yeni tablo: whiteboard_snapshots(session_id, png_base64, created_at) veya dosya sistemi
      - whiteboard snapshot’ı rapora dahil eder.
  Kabul kriteri:
  - Whiteboard canlı senkron.
  - Oturum sonunda raporda whiteboard görüntüsü var.

  ———
  # Phase 8 — Report UI + HTML tablo + Sheets + PDF (2–4 gün)
  ## Dev-A (Backend)

  - Dosya: packages/backend/src/Services/ReportService.php
      - public function generate(string $sessionId): array (tek DTO)
  - Dosya: packages/backend/src/Routes/SessionRoutes.php
      - GET /api/sessions/:id/report → ReportService->generate()

  ## Dev-B (Frontend)
  - Yeni dosyalar:
      - packages/frontend/src/pages/admin/SessionReportPage.tsx
      - packages/frontend/src/services/reportExport.ts
  - Export fonksiyonları:
      - export function reportToHtmlTable(report: ReportDto): string (mail’e yapıştır)

  Kabul kriteri:

  - Admin panelde session listesi + report görüntüleme var.
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
Phase W1 — Frontend: tldraw panelini ekle (Dev-B)



  - Yeni component: packages/frontend/src/components/Whiteboard/WhiteboardPanel.tsx
      - function WhiteboardPanel(props: { token: string; sessionId: string; readOnly?: boolean })
      - Mantık: full-size container + <Tldraw store={store} onMount={setEditorRef} />



      - export function createWhiteboardStore(opts: { persistenceKey: string }): TLStore

  ## Sync hook (WS ile)

      - Mantık:
          - WS’den patch gelince store’a uygula (loop önleme için sourceId)
  > Not: tldraw API detayları sürüme göre değişiyor; burada hedef “store change → patch → apply patch” hattını kurmak. Patch formatını siz

  ———

  # Phase W2 — Backend: WS mesajları + persistence (Dev-A)

  ## WS message types (shared)

  - packages/shared/src/index.ts
      - WHITEBOARD_INIT (server → client): { snapshot, version }
      - WHITEBOARD_PATCH (bi-directional): { changes, clientId, baseVersion }
      - WHITEBOARD_SNAPSHOT (client → server): { png_base64, w, h } (rapor için)

  ## Ratchet handler

  - packages/backend/src/WebSocket/MessageHandler.php
      - case 'whiteboard_patch': $this->onWhiteboardPatch($from, $payload);
      - case 'whiteboard_snapshot': $this->onWhiteboardSnapshot($from, $payload);
  - Yeni servis: packages/backend/src/Services/WhiteboardService.php
      - public function loadSnapshot(string $sessionId): ?array
      - public function appendPatch(string $sessionId, string $patchJson): void
  - Mantık:
      - JOIN sonrası server WHITEBOARD_INIT yollar (snapshot varsa)
          - session room’a broadcast et (except sender)
          - (opsiyonel) her N patch’te snapshot üretme işini client’a yaptır (server PHP’de “merge” zor; en pratik yol client periodic snapshot
  ## DB
  - packages/backend/database/schema.sql
      - whiteboard_patches(id TEXT PK, session_id TEXT, patch_json TEXT, created_at TEXT)
  ———
  # Phase W3 — Patch formatı (ikisi birlikte, 1–2 saat)

  tldraw store aslında “record” seti. Patch’i basit tutun:
  - baseVersion: client’ın bildiği server version (opsiyonel, conflict debug için)
  - clientId: loop önlemek için



  - 2 tarayıcı (interviewer + candidate) aynı session’da çizince canlı akıyor.
  - Refresh sonrası snapshot ile geri geliyor.

  ———

  # Phase W4 — Rapora whiteboard ekleme (Dev-A + Dev-B)

  ## Frontend: export

  - packages/frontend/src/services/whiteboardExport.ts
      - export async function exportWhiteboardPng(editor: Editor): Promise<{ base64: string; w: number; h: number }>
      - Mantık: tldraw editor export API ile PNG al, base64 yap

  ## Backend: report’a dahil

  - packages/backend/src/Services/ReportService.php
      - public function generate(string $sessionId): array
      - Mantık: whiteboard_previews.png_base64 varsa report DTO’ya ekle

  ## Admin UI: göster

  - packages/frontend/src/pages/admin/SessionReportPage.tsx
      - “Whiteboard” section: image render + “Download PNG” butonu

  ———
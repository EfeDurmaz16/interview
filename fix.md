
Aşağıdaki öneriler “otomatik patch” değil; repo’daki mevcut akışa göre hangi
  dosyada neyi değiştirmen gerektiğini adım adım anlatıyorum. (Bu repo’da WS
  mesajları pratikte { type, payload } formatında gidiyor; backend token ile
  sessionId/role’ü connection’a set ediyor ve broadcast(..., $except=$from) ile
  gönderene geri yollamıyor.)

  ———

  ## 3.1 runCode output senkron değil (CODE_OUTPUT gönderilmiyor)

  ### Mevcut durum

  - packages/frontend/src/contexts/EditorContext.tsx içindeki handleRun():
      - sendRun(code) atıyor (WS run_code)
      - PHP’yi local WASM ile çalıştırıyor (runPhp)
      - sonucu sadece local state’e yazıyor
  - Backend packages/backend/src/WebSocket/MessageHandler.php zaten code_output
    mesajını broadcast ediyor (case var).

  ### Yapman gerekenler

  #### 1) Frontend: WS üzerinden CODE_OUTPUT gönderecek bir fonksiyon ekle

  Dosya: packages/frontend/src/hooks/useCodeSync.ts

  - Şu an sendRun var, ama sendCodeOutput yok.
  - useWebSocket’ten gelen sendMessage ile yeni bir helper ekle:

  Önerilen ek:

  const sendCodeOutput = (result: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    executionTime?: number;
    error?: string;
  }) => {
    sendMessage({
      type: WSMessageType.CODE_OUTPUT,
      payload: result,
    });
  };

  Ve return’e ekle: sendCodeOutput.

  #### 2) Frontend: handleRun() içinde local çalıştırma bitince CODE_OUTPUT
  yayınla

  Dosya: packages/frontend/src/contexts/EditorContext.tsx

  handleRun içinde runPhp(code) sonucunu aldıktan sonra hem local state’i set
  et, hem de WS’ye gönder:

  - Başarılı durumda:
      - stdout, stderr, exitCode, executionTime gönder
  - Hata durumda:
      - error: e.message gibi gönder

  Örnek mantık:

  const result = await runPhp(code);
  sendCodeOutput({
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    executionTime: elapsed,
  });

  Catch tarafı:

  sendCodeOutput({ error: e.message ?? 'Execution failed', executionTime:
  elapsed });

  #### 3) Frontend: CODE_OUTPUT “error vs stderr” alanlarını tutarlı ele al

  EditorContext.tsx içinde incoming CODE_OUTPUT handler’ında şu an:

  - if (result?.error) ... else ...
  - else tarafında setError('') yapıyor ve sadece stdout basıyor.

  Ama sen payload’a stderr yollayacaksın; diğer client’ın “Errors” tabında
  göstermek için şunu netleştir:

  - error alanını gerçek exception için kullan
  - stderr alanını “PHP runtime errors” gibi göster

  Öneri:

  - if (result.error) setError(result.error)
  - else if (result.stderr) setError(result.stderr)
  - output = result.stdout

  ———

  ## 4.1 Interviewer sayfasında “Start Session” butonu yok

  ### Mevcut durum

  - Backend: PATCH /api/sessions/:id içinde action: 'start' var (packages/
    backend/src/Routes/SessionRoutes.php)
  - Frontend: bu endpoint’i çağıran hiçbir şey yok.

  ### Yapman gerekenler

  #### 1) SessionId’yi Interviewer UI’a taşı

  Dosya: packages/frontend/src/pages/InterviewPage.tsx

  resolveToken(token) zaten session_id dönüyor.

  - InterviewerView component’ine sessionId prop’u geçir.

  Örn fikir:

  - return <InterviewerView sessionId={resolveData.session_id} ... />

  #### 2) Start butonunu UI’a ekle ve PATCH çağrısı yap

  Dosya: packages/frontend/src/pages/InterviewerPage.tsx

  - State: isStarting, sessionStatus (örn waiting|active|ended)
  - Buton onClick:

  await fetch(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start' }),
  });

  #### 3) Backend’de startSession() sadece status update ediyor; started_at set
  etmiyor

  Dosya: packages/backend/src/Services/SessionService.php + packages/backend/
  src/Models/Session.php

  Schema’da started_at var (packages/backend/database/schema.sql) ama hiç
  doldurulmuyor.

  - startSession($id) → status='active' + started_at=datetime('now')
  - endSession($id) → status='ended' + ended_at=datetime('now')

  Bunu modelde ayrı metodlarla yapmak daha temiz:

  - markStarted($id)
  - markEnded($id)

  ———

  ## 4.2 Candidate “linke tıkladı mı / bağlı mı?” status’ü yok

  ### Mevcut durum

  - Backend WS peer_joined / peer_left broadcast ediyor (MessageHandler.php)
  - Frontend’de peer_joined / peer_left için hiç listener yok (rg sonucu boş).

  ### Yapman gerekenler (minimum)

  #### 1) Candidate connection state’i ekle

  Dosya: packages/frontend/src/pages/InterviewerPage.tsx

  - const [candidateConnected, setCandidateConnected] = useState(false);

  #### 2) Bu mesajları dinleyecek “lastMessage” erişimi lazım

  Şu an lastMessage sadece EditorProvider içinde var (useCodeSync).
  En az değişiklikle 2 seçenek:

  Seçenek A (önerilir): EditorContext’e lastMessage ve wsStatus ekle

  - EditorContext value’suna lastMessage koy
  - InterviewerContent içinde useEditor() ile alıp peer_joined/peer_left yakala

  Seçenek B (önermem): InterviewerPage içinde ayrıca useWebSocket(token) çağırma

  - İkinci WS connection açarsın (aynı session’a iki bağlantı), kafa karıştırır.

  #### 3) peer_joined/left yakalama

  InterviewerContent’te:

  - peer_joined payload.role === 'candidate' → setCandidateConnected(true)
  - peer_left payload.role === 'candidate' → setCandidateConnected(false)

  ### Önemli not (refresh problemi)

  Şu an backend, odaya yeni girene “odada kim var” bilgisini yollamıyor.

  - Interviewer refresh atarsa candidate zaten bağlı olsa bile peer_joined
    görmeyebilir.

  Bunu sağlam yapmak için backend’e bir mesaj daha eklemeni öneririm:

  Backend önerisi: room_state mesajı

  - ConnectionManager’a getRolesInRoom($sessionId): array ekle
  - onJoinSession içinde
    $conn->send(json_encode(['type'=>'room_state','payload'=>['roles'=>$roles]])
    )

  Frontend:

  - room_state.payload.roles içinde candidate varsa candidateConnected=true

  ———

  ## 4.3 Timer sayfa açılınca başlıyor; session başlamadan çalışıyor

  ### Mevcut durum

  - packages/frontend/src/components/Header/Header.tsx:
      - showTimer true ise mount olur olmaz interval başlatıyor.
  - Interviewer/Interviewee sayfaları showTimer’ı hep true kullanıyor.

  ### Yapman gerekenler

  “Header session kontrol etsin” yerine daha temiz yaklaşım:

  - Session status’ü parent sayfa fetch eder
  - Header’a showTimer={session.status==='active'} verirsin

  Adımlar:

  1. Interviewer ve Interviewee tarafında GET /api/sessions/:id ile session
     status’ü çek
  2. Header showTimer sadece active iken true
  3. (İsteğe bağlı) started_at’tan elapsed hesaplayıp timer’ı doğru yerden
     başlat

  ———

  ## 4.4 End Session: DB güncellenmiyor + adaya haber gitmiyor

  ### Mevcut durum

  - packages/frontend/src/pages/InterviewPage.tsx handleEndSession() sadece
    navigate('/').

  ### Yapman gerekenler

  #### 1) Session ended WS mesaj tipini shared’e ekle

  Dosya: packages/shared/src/index.ts

  - WSMessageType.SESSION_ENDED = 'session_ended'

  (İstersen SESSION_STARTED da ekleyebilirsin.)

  #### 2) Backend WS handler bu tipi broadcast etmeli

  Dosya: packages/backend/src/WebSocket/MessageHandler.php

  - switch içine:
      - case 'session_ended': $this->onBroadcast(...); break;

  #### 3) End Session butonuna basınca:

  - REST: PATCH /api/sessions/:id {action:'end'}
  - WS: session_ended mesajı gönder (candidate’a gitsin)
  - Sonra navigate

  Bunu yaparken kritik nokta:

  - WS send edebilmek için aynı WS connection’a erişmen lazım.
  - O connection şu an EditorProvider içinde açılıyor.
    Bu yüzden en pratik yer:
  - InterviewerPage.tsx içinde (EditorProvider altındaki component’te) “end
    session” logic’ini yazmak.

  #### 4) Candidate tarafı session_ended dinleyip UI aksiyonu alsın

  Dosya: packages/frontend/src/pages/IntervieweePage.tsx

  - useEffect ile EditorContext’ten gelen lastMessage (veya EditorContext’te
    expose edeceğin sessionEnded state) dinlenir
  - Geldiğinde:
      - alert/banner göster + navigate et, veya editor’ü disable et

  ———

  ## 4.5 WS bağlantısı kesilince session DB’de “active” kalıyor

  ### Mevcut durum

  - packages/backend/src/WebSocket/MessageHandler.php::handleClose()
      - sadece peer_left broadcast ediyor
      - DB update yok

  ### Yapman gerekenler

  1. ConnectionManager’a:
      - room’daki connection sayısını/rolleri döndüren metod ekle (örn
        countRoomConnections, countByRole)
  2. handleClose() içinde:
      - $info = $this->connections->removeConnection($conn);
      - $sessionId = $info['session_id']
      - $role = $info['role']
  3. Kural:
      - Eğer ayrılan role==='interviewer' ise: endSession(sessionId) + kalanlara
        session_ended broadcast
      - Eğer odada hiç bağlantı kalmadıysa: endSession(sessionId)

  Bunun için MessageHandler’ın SessionService’e erişmesi lazım.

  - packages/backend/bin/server.php şu an SessionService require etmiyor;
    eklemen gerekecek:
      - require Session.php
      - require SessionService.php
      - MessageHandler constructor’ına SessionService inject et (veya model)

  ———

  ## 5.1 SUBMIT_CODE DB’ye kaydolmuyor (CodeSnapshot kullanılmıyor)

  ### Mevcut durum

  - Backend submit_code sadece broadcast ediyor.
  - packages/backend/src/Models/CodeSnapshot.php şu an SQLite/PDO ile uyumsuz:
      - bind() diye bir method PDO’da yok
      - query’de :code_content var ama bind :code
      - schema kolonu is_submission, code is_submitted
      - id TEXT PRIMARY KEY ama id üretmiyor
      - NOW() SQLite’ta yok

  ### Yapman gerekenler

  #### 1) CodeSnapshot modelini PDO ile düzelt

  Dosya: packages/backend/src/Models/CodeSnapshot.php

  - create() içinde:
      - $id = 'snap_' . uniqid();
      - INSERT INTO code_snapshots (id, session_id, question_id, code,
        is_submission, created_at) VALUES (...)
      - created_at için datetime('now') veya kolonu default’a bırak

  #### 2) MessageHandler submit_code case’inde DB’ye yaz

  Dosya: packages/backend/src/WebSocket/MessageHandler.php

  - submit_code geldiğinde:
      - $sessionId = $from->sessionId
      - $questionId = $payload['question_id']
      - $code = $payload['code']
      - CodeSnapshot->create($sessionId, $questionId, $code, true)
      - sonra broadcast

  #### 3) WebSocket server entrypoint’te CodeSnapshot require et

  Dosya: packages/backend/bin/server.php

  - require __DIR__ . '/../src/Models/CodeSnapshot.php';

  #### 4) Frontend’de Submit şu an yanlış bağlanmış

  Dosya: packages/frontend/src/pages/IntervieweePage.tsx

  - CodeEditor içinde onSubmit={handleRun} yanlış.
  - onSubmit={handleSubmit} olmalı.
    Ayrıca handleSubmit(questionId) için question id gerekiyor:
  - Ya EditorProvider’a questionId prop’u geçir
  - Ya da submit sırasında sidebar’daki seçili sorunun id’sini gönder

  ———

  ## Ek kritik tutarsızlıklar (işi büyütmeden bilmen iyi)

  - packages/shared/src/index.ts içindeki role: 'interviewer'|'interviewee' ile
    backend token role’ü 'candidate' uyuşmuyor.
  - Session.status shared’de "pending"|"active"|"completed"; DB’de waiting|
    active|ended.
    Bu uyuşmazlıklar ileride TS/types ve UI logic’ini bozuyor; bir noktada tek
    sözlükte birleştirmen iyi olur.

  ———

  İstersen bir sonraki adım olarak şunu yapalım: “öncelik sırası”na göre (3.1 →
  4.1/4.2/4.3 → 4.4/4.5 → 5.1) tek tek ilerleyelim ve her adımda tam olarak
  hangi payload’ı gönderdiğini/karşıladığını beraber netleştirelim.
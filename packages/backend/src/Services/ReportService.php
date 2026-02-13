<?php
 class ReportService
  {
      private function decodeJson($raw, $fallback)
      {
          if (is_array($raw)) return $raw;
          if (!is_string($raw) || $raw === '') return $fallback;

          $decoded = json_decode($raw, true);
          return is_array($decoded) ? $decoded : $fallback;
      }

      private function durationMinutes(?string $start, ?string $end): ?int
      {
          if (!$start || !$end) return null;

          $s = strtotime($start);
          $e = strtotime($end);

          if ($s === false || $e === false || $e < $s) return null;

          return (int) floor(($e - $s) / 60);
      }

      private function getLastSubmission(PDO $db, string $sessionId, string $questionId): ?array
      {
          $stmt = $db->prepare(
              "SELECT code, created_at
               FROM code_snapshots
               WHERE session_id = ? AND question_id = ? AND is_submission = 1
               ORDER BY created_at DESC
               LIMIT 1"
          );
          $stmt->execute([$sessionId, $questionId]);
          $row = $stmt->fetch(PDO::FETCH_ASSOC);

          if (!$row) return null;

          return [
              'files' => [
                  'solution.php' => (string)($row['code'] ?? ''),
              ],
              'submittedAt' => (string)($row['created_at'] ?? ''),
          ];
      }

      public function generate(string $sessionId): array
      {
          $db = Database::getConnection();
          $sessionModel = new Session();
          $questionModel = new Question();
          $evaluationModel = new Evaluation();

          $session = $sessionModel->findById($sessionId);
          if (!$session) {
              return [
                  'session' => [
                      'id' => $sessionId,
                      'candidateName' => '',
                      'interviewerName' => 'Interviewer',
                      'status' => 'ended',
                      'startedAt' => null,
                      'endedAt' => null,
                      'durationMinutes' => null,
                  ],
                  'questions' => [],
                  'whiteboardSnapshot' => null,
              ];
          }

          $questions = $questionModel->getQuestionsBySessionId($sessionId);
          $questionDtos = [];

          foreach ($questions as $q) {
              $qid = (string)($q['id'] ?? '');
              if ($qid === '') continue;

              $evaluation = $evaluationModel->getBySessionAndQuestion($sessionId, $qid);
              $lastSubmission = $this->getLastSubmission($db, $sessionId, $qid);

              $questionDtos[] = [
                  'id' => $qid,
                  'title' => (string)($q['title'] ?? ''),
                  'level' => (string)($q['level'] ?? 'junior'),
                  'kind' => (string)($q['kind'] ?? 'coding'),
                  'difficulty' => (string)($q['difficulty'] ?? 'easy'),
                  'evaluation' => $evaluation ? [
                      'criteriaScores' => $this->decodeJson($evaluation['criteria_scores'] ?? '{}', []),
                      'notes' => (string)($evaluation['notes'] ?? ''),
                  ] : null,
                  'lastSubmission' => $lastSubmission,
              ];
          }

          $wbStmt = $db->prepare(
              "SELECT snapshot_data
               FROM whiteboard_snapshot
               WHERE session_id = ?
               ORDER BY created_at DESC
               LIMIT 1"
          );
          $wbStmt->execute([$sessionId]);
          $wbRow = $wbStmt->fetch(PDO::FETCH_ASSOC);

          $whiteboardSnapshot = null;
          if ($wbRow && !empty($wbRow['snapshot_data'])) {
              $raw = (string)$wbRow['snapshot_data'];
              $parsed = json_decode($raw, true);

              if (is_array($parsed) && isset($parsed['base64Png'])) {
                  $whiteboardSnapshot = [
                      'base64Png' => (string)$parsed['base64Png'],
                      'width' => (int)($parsed['width'] ?? 0),
                      'height' => (int)($parsed['height'] ?? 0),
                  ];
              } else {
                  $whiteboardSnapshot = [
                      'base64Png' => $raw,
                      'width' => 0,
                      'height' => 0,
                  ];
              }
          }

          return [
              'session' => [
                  'id' => (string)$session['id'],
                  'candidateName' => (string)($session['candidate_name'] ?? ''),
                  'interviewerName' => 'Interviewer',
                  'status' => (string)($session['status'] ?? 'waiting'),
                  'startedAt' => $session['started_at'] ?? null,
                  'endedAt' => $session['ended_at'] ?? null,
                  'durationMinutes' => $this->durationMinutes(
                      $session['started_at'] ?? null,
                      $session['ended_at'] ?? null
                  ),
              ],
              'questions' => $questionDtos,
              'whiteboardSnapshot' => $whiteboardSnapshot,
          ];
      }

      public function generateReport(string $sessionId): array
      {
          return $this->generate($sessionId);
      }
  }

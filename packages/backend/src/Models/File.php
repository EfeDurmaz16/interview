<?php

  class File {
        //SUBMIT EDİNCE NELER DÖNÜYOR KONTROL ET DÜZENLEME YAP
        //GETBYNAME'İ YOK ETMEK İSTİYORUM ALLAH NAMEIN BELASINI VERSİN
      public function getOrCreateId(string $sessionId, string $questionId, string $name): string {
          if ($sessionId === '' || $questionId === '' || $name === '') {
              throw new InvalidArgumentException('sessionId, questionId and name are required');
          }

          $existing = $this->getByName($sessionId, $questionId, $name);
          if ($existing !== null) {
              return (string) $existing['id'];
          }

          return $this->create($sessionId, $questionId, $name);
      }

      public function create(string $sessionId, string $questionId, string $name): string {
          $db = Database::getConnection();
          $id = 'f_' . uniqid();

          if ($sessionId === '' || $questionId === '' || $name === '') {
              throw new InvalidArgumentException('sessionId, questionId and name are required');
          }

          if (!preg_match('/^[A-Za-z0-9_]+\.php$/', $name)) {
              throw new InvalidArgumentException("Invalid file name: {$name}");
          }

          $ins = $db->prepare(
              'INSERT INTO files (id, session_id, question_id, name) VALUES (?, ?, ?, ?)'
          );
          $ins->execute([$id, $sessionId, $questionId, $name]);

          return $id;
      }

      public function getById(string $id, string $sessionId, string $questionId): ?array {
          $db = Database::getConnection();

          if ($id === '' || $sessionId === '' || $questionId === '') {
              throw new InvalidArgumentException('id, sessionId and questionId are required');
          }

          $stmt = $db->prepare(
              'SELECT * FROM files WHERE id = ? AND session_id = ? AND question_id = ? LIMIT 1'
          );
          $stmt->execute([$id, $sessionId, $questionId]);

          return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
      }

      public function getByName(string $sessionId, string $questionId, string $name): ?array {
          $db = Database::getConnection();

          if ($sessionId === '' || $questionId === '' || $name === '') {
              throw new InvalidArgumentException('sessionId, questionId and name are required');
          }

          $stmt = $db->prepare(
              'SELECT * FROM files WHERE session_id = ? AND question_id = ? AND name = ? LIMIT 1'
          );
          $stmt->execute([$sessionId, $questionId, $name]);

          return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
      }
  }

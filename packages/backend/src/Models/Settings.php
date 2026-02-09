<?php

class Settings {
    public function get(string $key): ?string {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT value FROM settings WHERE key = ?');
        $stmt->execute([$key]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['value'] : null;
    }

    public function set(string $key, string $value): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        $stmt->execute([$key, $value]);
    }

    public function delete(string $key): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM settings WHERE key = ?');
        $stmt->execute([$key]);
    }
}

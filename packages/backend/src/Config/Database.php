<?php

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            self::$instance = new PDO('sqlite:' . __DIR__ . '/../../database/interview.sqlite');
        }
        return self::$instance;
    }

    public static function init(): void {
        self::$instance = new PDO('sqlite:' . __DIR__ . '/../../database/interview.sqlite');
        self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        self::$instance->exec('PRAGMA foreign_keys = ON');

        // Run schema statements one by one (exec only runs the first statement)
        $schema = file_get_contents(__DIR__ . '/../../database/schema.sql');
        $statements = array_filter(array_map('trim', explode(';', $schema)));
        foreach ($statements as $stmt) {
            if ($stmt !== '') {
                self::$instance->exec($stmt);
            }
        }

        // Seed default superadmin password if not exists
        $check = self::$instance->prepare('SELECT COUNT(*) FROM settings WHERE key = ?');
        $check->execute(['superadmin_password']);
        if ((int) $check->fetchColumn() === 0) {
            $hash = password_hash('superadmin123', PASSWORD_BCRYPT);
            $ins = self::$instance->prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
            $ins->execute(['superadmin_password', $hash]);
        }
    }

}

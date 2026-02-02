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
        self::$instance->exec(file_get_contents(__DIR__ . '/../../database/schema.sql'));
    }

}

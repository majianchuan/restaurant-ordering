<?php

declare(strict_types=1);

namespace App;

use PDO;

/**
 * PDO 连接管理。
 */
final class Database
{
    private static ?PDO $connection = null;

    private static ?PDO $serverConnection = null;

    /**
     * 连接到 .env 中配置的数据库。
     */
    public static function pdo(): PDO
    {
        if (self::$connection === null) {
            self::$connection = self::connect(Config::require('DB_DATABASE'));
        }

        return self::$connection;
    }

    /**
     * 不指定数据库的连接，仅用于创建数据库。
     */
    public static function server(): PDO
    {
        if (self::$serverConnection === null) {
            self::$serverConnection = self::connect(null);
        }

        return self::$serverConnection;
    }

    private static function connect(?string $database): PDO
    {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;charset=utf8mb4',
            (string) Config::get('DB_HOST', '127.0.0.1'),
            (string) Config::get('DB_PORT', '3306')
        );

        if ($database !== null && $database !== '') {
            $dsn .= ';dbname=' . $database;
        }

        return new PDO(
            $dsn,
            (string) Config::get('DB_USERNAME', 'root'),
            (string) Config::get('DB_PASSWORD', ''),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    }
}

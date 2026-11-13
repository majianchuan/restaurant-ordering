<?php

declare(strict_types=1);

namespace App\Support;

use App\Config;
use App\Database;
use PDO;

/**
 * 首次启动时自动创建数据库、数据表并写入演示数据。
 */
final class Installer
{
    public static function lockFile(): string
    {
        return STORAGE_PATH . DIRECTORY_SEPARATOR . 'installed.lock';
    }

    public static function isInstalled(): bool
    {
        return is_file(self::lockFile());
    }

    public static function ensureInstalled(): void
    {
        if (self::isInstalled() && self::hasSchema()) {
            return;
        }

        self::install();
    }

    /**
     * 安装标记文件可能被复制到其他环境，这里再确认数据表确实存在。
     */
    private static function hasSchema(): bool
    {
        try {
            Database::pdo()->query('SELECT 1 FROM users LIMIT 1');

            return true;
        } catch (\PDOException) {
            return false;
        }
    }

    public static function install(): void
    {
        $database = Config::require('DB_DATABASE');
        if (!preg_match('/^[A-Za-z0-9_]+$/', $database)) {
            throw new \RuntimeException('DB_DATABASE 只能包含字母、数字和下划线');
        }

        $server = Database::server();
        $server->exec(sprintf(
            'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
            $database
        ));
        $server->exec(sprintf('USE `%s`', $database));

        $schema = file_get_contents(BASE_PATH . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'schema.sql');
        if ($schema === false) {
            throw new \RuntimeException('无法读取 database/schema.sql');
        }

        foreach (self::splitStatements($schema) as $statement) {
            $server->exec($statement);
        }

        self::seed();
        self::writeLock();
    }

    public static function writeLock(): void
    {
        if (!is_dir(STORAGE_PATH) && !mkdir(STORAGE_PATH, 0777, true) && !is_dir(STORAGE_PATH)) {
            throw new \RuntimeException('无法创建 storage 目录');
        }

        file_put_contents(self::lockFile(), date('Y-m-d H:i:s'));
    }

    /**
     * @return array<int, string>
     */
    private static function splitStatements(string $sql): array
    {
        $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;

        $statements = [];
        foreach (explode(';', $sql) as $chunk) {
            $chunk = trim($chunk);
            if ($chunk !== '') {
                $statements[] = $chunk;
            }
        }

        return $statements;
    }

    private static function seed(): void
    {
        $pdo = Database::pdo();

        if ((int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() === 0) {
            $pdo->prepare('INSERT INTO users (username, nickname, password_hash, role) VALUES (?, ?, ?, ?)')
                ->execute(['admin', '店长0001', hash('sha256', '123456'), 'manager']);
        }

        if ((int) $pdo->query('SELECT COUNT(*) FROM menu_items')->fetchColumn() === 0) {
            self::seedMenu($pdo);
        }

        if ((int) $pdo->query('SELECT COUNT(*) FROM dining_tables')->fetchColumn() === 0) {
            $stmt = $pdo->prepare('INSERT INTO dining_tables (public_code, name) VALUES (?, ?)');
            foreach ([1, 2, 3] as $number) {
                $stmt->execute([bin2hex(random_bytes(16)), $number . '桌']);
            }
        }
    }

    private static function seedMenu(PDO $pdo): void
    {
        if (!is_dir(UPLOAD_PATH) && !mkdir(UPLOAD_PATH, 0777, true) && !is_dir(UPLOAD_PATH)) {
            throw new \RuntimeException('无法创建图片存储目录');
        }

        $items = [
            ['宫保鸡丁', '38.00', '花生与鸡丁的经典搭配，酸甜微辣，下饭首选', 'seed-gongbao.svg', '🍗', '#FFF1E6', '#FFBB96'],
            ['麻婆豆腐', '26.00', '麻辣鲜香的嫩豆腐，川味十足', 'seed-mapo.svg', '🌶️', '#FFF0F0', '#FFA39E'],
            ['鱼香肉丝', '32.00', '咸甜酸辣兼备，经典下饭菜', 'seed-yuxiang.svg', '🥩', '#FFF7E6', '#FFD591'],
            ['清炒时蔬', '18.00', '当季新鲜蔬菜，清爽解腻', 'seed-shucai.svg', '🥬', '#F6FFED', '#B7EB8F'],
            ['番茄蛋汤', '12.00', '酸甜开胃的家常靓汤', 'seed-tang.svg', '🍅', '#FFF2F0', '#FFCCC7'],
            ['米饭', '2.00', '东北大米，粒粒分明', 'seed-mifan.svg', '🍚', '#FAFAFA', '#D9D9D9'],
        ];

        $insert = $pdo->prepare(
            'INSERT INTO menu_items (name, price, description, image_url) VALUES (?, ?, ?, ?)'
        );

        foreach ($items as [$name, $price, $description, $file, $emoji, $background, $accent]) {
            $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{$background}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="480" height="360" fill="url(#bg)"/>
  <circle cx="240" cy="178" r="118" fill="{$accent}" opacity="0.35"/>
  <circle cx="240" cy="178" r="92" fill="#ffffff" opacity="0.55"/>
  <text x="240" y="182" font-size="132" text-anchor="middle" dominant-baseline="central">{$emoji}</text>
</svg>
SVG;

            file_put_contents(UPLOAD_PATH . DIRECTORY_SEPARATOR . $file, $svg);
            $insert->execute([$name, $price, $description, '/api/uploads/' . $file]);
        }
    }
}

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
            self::seedUsers($pdo);
        }

        if ((int) $pdo->query('SELECT COUNT(*) FROM menu_items')->fetchColumn() === 0) {
            self::seedMenu($pdo);
        }

        if ((int) $pdo->query('SELECT COUNT(*) FROM dining_tables')->fetchColumn() === 0) {
            $stmt = $pdo->prepare('INSERT INTO dining_tables (public_code, name) VALUES (?, ?)');
            foreach ([1, 2, 3, 4, 5, 6] as $number) {
                $stmt->execute([bin2hex(random_bytes(16)), $number . '桌']);
            }
        }

        if ((int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn() === 0) {
            self::seedOrders($pdo);
        }
    }

    private static function seedUsers(PDO $pdo): void
    {
        $password = hash('sha256', '123456');
        $users = [
            ['admin', '店长0001', 'manager', ''],
            ['chef01', '厨师0001', 'chef', ''],
            ['cashier01', '收银员0001', 'cashier', ''],
            ['customer01', '顾客0001', 'customer', '13800000000'],
        ];

        $stmt = $pdo->prepare(
            'INSERT INTO users (username, nickname, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)'
        );
        foreach ($users as [$username, $nickname, $role, $phone]) {
            $stmt->execute([$username, $nickname, $phone, $password, $role]);
        }
    }

    private static function seedMenu(PDO $pdo): void
    {
        if (!is_dir(UPLOAD_PATH) && !mkdir(UPLOAD_PATH, 0777, true) && !is_dir(UPLOAD_PATH)) {
            throw new \RuntimeException('无法创建图片存储目录');
        }

        $items = [
            ['宫保鸡丁', '热菜', '38.00', '花生与鸡丁的经典搭配，酸甜微辣，下饭首选', 'seed-gongbao.svg', '🍗', '#FFF1E6', '#FFBB96'],
            ['麻婆豆腐', '热菜', '26.00', '麻辣鲜香的嫩豆腐，川味十足', 'seed-mapo.svg', '🌶️', '#FFF0F0', '#FFA39E'],
            ['鱼香肉丝', '热菜', '32.00', '咸甜酸辣兼备，经典下饭菜', 'seed-yuxiang.svg', '🥩', '#FFF7E6', '#FFD591'],
            ['清炒时蔬', '素菜', '18.00', '当季新鲜蔬菜，清爽解腻', 'seed-shucai.svg', '🥬', '#F6FFED', '#B7EB8F'],
            ['凉拌黄瓜', '凉菜', '16.00', '清脆爽口，蒜香开胃', 'seed-huanggua.svg', '🥒', '#F6FFED', '#D9F7BE'],
            ['番茄蛋汤', '汤品', '12.00', '酸甜开胃的家常靓汤', 'seed-tang.svg', '🍅', '#FFF2F0', '#FFCCC7'],
            ['米饭', '主食', '2.00', '东北大米，粒粒分明', 'seed-mifan.svg', '🍚', '#FAFAFA', '#D9D9D9'],
            ['酸梅汤', '饮品', '8.00', '冰镇酸梅汤，解腻消暑', 'seed-suanmei.svg', '🥤', '#F0F5FF', '#ADC6FF'],
        ];

        $insert = $pdo->prepare(
            'INSERT INTO menu_items (name, category, price, description, image_url) VALUES (?, ?, ?, ?, ?)'
        );

        foreach ($items as [$name, $category, $price, $description, $file, $emoji, $background, $accent]) {
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
            $insert->execute([$name, $category, $price, $description, '/api/uploads/' . $file]);
        }
    }

    private static function seedOrders(PDO $pdo): void
    {
        $customerId = self::idOf($pdo, 'users', 'username', 'customer01');
        $tableIds = [];
        foreach ([1, 2, 3, 4, 5] as $number) {
            $tableIds[$number] = self::idOf($pdo, 'dining_tables', 'name', $number . '桌');
        }

        $menu = [];
        foreach (['宫保鸡丁', '麻婆豆腐', '鱼香肉丝', '清炒时蔬', '凉拌黄瓜', '番茄蛋汤', '米饭', '酸梅汤'] as $name) {
            $menu[$name] = self::idOf($pdo, 'menu_items', 'name', $name);
        }

        if ($customerId === null || in_array(null, $tableIds, true) || in_array(null, $menu, true)) {
            return;
        }

        $now = time();

        // 1 桌：制作中，一道已做、一道未做
        self::insertOrder(
            $pdo,
            $tableIds[1],
            $customerId,
            'pending',
            date('Y-m-d H:i:s', $now - 12 * 60),
            null,
            [
                [$menu['宫保鸡丁'], 2, 1],
                [$menu['麻婆豆腐'], 1, 0],
            ]
        );

        // 2 桌：今天早些时候的一笔已结账订单（保留历史记录）
        self::insertOrder(
            $pdo,
            $tableIds[2],
            $customerId,
            'paid',
            date('Y-m-d H:i:s', $now - 4 * 3600),
            date('Y-m-d H:i:s', (int) ($now - 3.5 * 3600)),
            [
                [$menu['宫保鸡丁'], 1, 1],
                [$menu['酸梅汤'], 1, 1],
            ]
        );

        // 2 桌：已上齐，等待结账
        self::insertOrder(
            $pdo,
            $tableIds[2],
            $customerId,
            'served',
            date('Y-m-d H:i:s', $now - 25 * 60),
            null,
            [
                [$menu['麻婆豆腐'], 1, 1],
                [$menu['米饭'], 2, 1],
            ]
        );

        // 3 桌：今天已结账，用于统计和评价
        $order3 = self::insertOrder(
            $pdo,
            $tableIds[3],
            $customerId,
            'paid',
            date('Y-m-d H:i:s', $now - 70 * 60),
            date('Y-m-d H:i:s', $now - 55 * 60),
            [
                [$menu['鱼香肉丝'], 1, 1],
                [$menu['番茄蛋汤'], 1, 1],
            ]
        );

        // 4 桌：昨天已结账
        self::insertOrder(
            $pdo,
            $tableIds[4],
            $customerId,
            'paid',
            date('Y-m-d H:i:s', $now - 26 * 3600),
            date('Y-m-d H:i:s', $now - 25 * 3600),
            [
                [$menu['清炒时蔬'], 1, 1],
                [$menu['米饭'], 2, 1],
            ]
        );

        // 5 桌：三天前已结账，用于趋势图
        self::insertOrder(
            $pdo,
            $tableIds[5],
            $customerId,
            'paid',
            date('Y-m-d H:i:s', $now - 3 * 86400),
            date('Y-m-d H:i:s', $now - 3 * 86400 + 900),
            [
                [$menu['凉拌黄瓜'], 2, 1],
                [$menu['酸梅汤'], 2, 1],
            ]
        );

        // 评价与收藏
        $pdo->prepare(
            'INSERT INTO reviews (order_id, user_id, menu_item_id, rating, content, created_at)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            $order3,
            $customerId,
            $menu['鱼香肉丝'],
            5,
            '鱼香肉丝很下饭，汤也很热乎，出餐速度不错。',
            date('Y-m-d H:i:s', $now - 40 * 60),
        ]);

        $pdo->prepare(
            'INSERT INTO favorites (user_id, menu_item_id) VALUES (?, ?)'
        )->execute([$customerId, $menu['宫保鸡丁']]);
        $pdo->prepare(
            'INSERT INTO favorites (user_id, menu_item_id) VALUES (?, ?)'
        )->execute([$customerId, $menu['酸梅汤']]);
    }

    /**
     * @param array<int, array{0: int, 1: int, 2: int}> $items
     */
    private static function insertOrder(
        PDO $pdo,
        int $tableId,
        int $customerId,
        string $status,
        string $createdAt,
        ?string $paidAt,
        array $items
    ): int {
        $pdo->prepare(
            'INSERT INTO orders (table_id, customer_id, status, created_at, updated_at, paid_at, pending_table_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $tableId,
            $customerId,
            $status,
            $createdAt,
            $paidAt ?? $createdAt,
            $paidAt,
            $status === 'paid' ? null : $tableId,
        ]);

        $orderId = (int) $pdo->lastInsertId();
        $insert = $pdo->prepare(
            'INSERT INTO order_items (order_id, menu_item_id, quantity, is_done) VALUES (?, ?, ?, ?)'
        );
        foreach ($items as [$menuItemId, $quantity, $done]) {
            $insert->execute([$orderId, $menuItemId, $quantity, $done]);
        }

        return $orderId;
    }

    private static function idOf(PDO $pdo, string $table, string $column, string $value): ?int
    {
        $stmt = $pdo->prepare("SELECT id FROM {$table} WHERE {$column} = ? LIMIT 1");
        $stmt->execute([$value]);
        $id = $stmt->fetchColumn();

        return $id === false ? null : (int) $id;
    }
}

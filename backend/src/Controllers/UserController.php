<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Http\HttpException;
use App\Http\Request;
use App\Support\Str;

final class UserController
{
    private const ROLE_LABELS = [
        'manager' => '店长',
        'chef' => '厨师',
        'cashier' => '收银员',
    ];

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function index(): array
    {
        $role = trim((string) ($_GET['role'] ?? ''));
        $keyword = trim((string) ($_GET['keyword'] ?? ''));
        $where = [];
        $params = [];

        if (in_array($role, ['manager', 'chef', 'cashier'], true)) {
            $where[] = 'role = ?';
            $params[] = $role;
        }
        if ($keyword !== '') {
            $where[] = '(username LIKE ? OR nickname LIKE ?)';
            $params[] = '%' . $keyword . '%';
            $params[] = '%' . $keyword . '%';
        }

        $sql = 'SELECT id, username, nickname, role, created_at FROM users';
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= " ORDER BY FIELD(role, 'manager', 'chef', 'cashier'), id";

        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($params);

        return array_map([self::class, 'map'], $stmt->fetchAll());
    }

    /**
     * @return array<string, mixed>
     */
    public static function store(): array
    {
        $body = Request::json();

        $role = (string) ($body['role'] ?? '');
        if (!in_array($role, ['chef', 'cashier'], true)) {
            throw new HttpException(422, '只能创建厨师或收银员账户');
        }

        $username = trim((string) ($body['username'] ?? ''));
        if (!preg_match('/^[A-Za-z0-9_]{3,30}$/', $username)) {
            throw new HttpException(422, '用户名需为 3-30 位字母、数字或下划线');
        }

        $password = (string) ($body['password'] ?? '');
        if ($password === '') {
            throw new HttpException(422, '请输入密码');
        }
        if (strlen($password) > 100) {
            throw new HttpException(422, '密码过长');
        }

        $nickname = trim((string) ($body['nickname'] ?? ''));
        if ($nickname === '') {
            throw new HttpException(422, '请输入昵称');
        }
        if (Str::length($nickname) > 30) {
            throw new HttpException(422, '昵称不能超过 30 个字符');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        if ($stmt->fetchColumn() !== false) {
            throw new HttpException(409, '用户名已存在');
        }

        $pdo->prepare('INSERT INTO users (username, nickname, password_hash, role) VALUES (?, ?, ?, ?)')
            ->execute([$username, $nickname, password_hash($password, PASSWORD_DEFAULT), $role]);

        $id = (int) $pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT id, username, nickname, role, created_at FROM users WHERE id = ?');
        $stmt->execute([$id]);

        return self::map($stmt->fetch());
    }

    /**
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function destroy(array $params): array
    {
        $user = Auth::requireRole('manager');
        $id = (int) ($params['id'] ?? 0);

        $stmt = Database::pdo()->prepare('SELECT id, role FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $target = $stmt->fetch();

        if ($target === false) {
            throw new HttpException(404, '账户不存在');
        }

        if ($target['role'] === 'manager') {
            throw new HttpException(403, '不能删除店长账户');
        }

        if ((int) $target['id'] === (int) $user['id']) {
            throw new HttpException(403, '不能删除自己的账户');
        }

        Database::pdo()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);

        return ['ok' => true];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function map(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'username' => $row['username'],
            'nickname' => $row['nickname'],
            'role' => $row['role'],
            'roleLabel' => self::ROLE_LABELS[$row['role']] ?? $row['role'],
            'createdAt' => $row['created_at'] ?? null,
        ];
    }
}

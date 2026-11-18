<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Config;
use App\Database;
use App\Http\HttpException;
use App\Http\Request;
use App\Jwt;
use App\Support\Str;

final class AuthController
{
    /**
     * @return array<string, mixed>
     */
    public static function login(): array
    {
        $body = Request::json();
        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if ($username === '' || $password === '') {
            throw new HttpException(422, '请输入用户名和密码');
        }

        $stmt = Database::pdo()->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user === false || !hash_equals((string) $user['password_hash'], hash('sha256', $password))) {
            throw new HttpException(401, '用户名或密码错误');
        }

        return [
            'token' => self::issueToken($user),
            'user' => self::mapUser($user),
        ];
    }

    /**
     * 顾客自助注册；员工账号仍由店长创建。
     *
     * @return array<string, mixed>
     */
    public static function register(): array
    {
        $body = Request::json();
        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $nickname = trim((string) ($body['nickname'] ?? ''));
        $phone = trim((string) ($body['phone'] ?? ''));

        if (!preg_match('/^[A-Za-z0-9_]{3,30}$/', $username)) {
            throw new HttpException(422, '用户名需为 3-30 位字母、数字或下划线');
        }
        if ($password === '') {
            throw new HttpException(422, '请输入密码');
        }
        if (strlen($password) > 100) {
            throw new HttpException(422, '密码过长');
        }
        if ($nickname === '') {
            $nickname = '顾客' . str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        }
        if (Str::length($nickname) > 30) {
            throw new HttpException(422, '昵称不能超过 30 个字符');
        }
        if ($phone !== '' && !preg_match('/^[0-9+\-\s]{5,20}$/', $phone)) {
            throw new HttpException(422, '手机号格式不正确');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        if ($stmt->fetchColumn() !== false) {
            throw new HttpException(409, '用户名已存在');
        }

        $pdo->prepare(
            'INSERT INTO users (username, nickname, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)'
        )->execute([$username, $nickname, $phone, hash('sha256', $password), 'customer']);

        $id = (int) $pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $user = $stmt->fetch();

        return [
            'token' => self::issueToken($user),
            'user' => self::mapUser($user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function me(): array
    {
        return Auth::requireUser();
    }

    /**
     * 个人资料编辑（昵称、手机号）。
     *
     * @return array<string, mixed>
     */
    public static function updateProfile(): array
    {
        $user = Auth::requireUser();
        $body = Request::json();

        $nickname = trim((string) ($body['nickname'] ?? $user['nickname']));
        $phone = trim((string) ($body['phone'] ?? ($user['phone'] ?? '')));

        if ($nickname === '') {
            throw new HttpException(422, '昵称不能为空');
        }
        if (Str::length($nickname) > 30) {
            throw new HttpException(422, '昵称不能超过 30 个字符');
        }
        if ($phone !== '' && !preg_match('/^[0-9+\-\s]{5,20}$/', $phone)) {
            throw new HttpException(422, '手机号格式不正确');
        }

        Database::pdo()->prepare('UPDATE users SET nickname = ?, phone = ? WHERE id = ?')
            ->execute([$nickname, $phone, $user['id']]);

        $stmt = Database::pdo()->prepare(
            'SELECT id, username, nickname, phone, role, created_at FROM users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$user['id']]);

        return self::mapUser($stmt->fetch());
    }

    /**
     * @return array<string, mixed>
     */
    public static function changePassword(): array
    {
        $user = Auth::requireUser();
        $body = Request::json();

        $current = (string) ($body['currentPassword'] ?? '');
        $new = (string) ($body['newPassword'] ?? '');

        if ($current === '' || $new === '') {
            throw new HttpException(422, '请填写原密码和新密码');
        }

        if (strlen($new) > 100) {
            throw new HttpException(422, '新密码过长');
        }

        $stmt = Database::pdo()->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$user['id']]);
        $hash = $stmt->fetchColumn();

        if ($hash === false || !hash_equals((string) $hash, hash('sha256', $current))) {
            throw new HttpException(422, '原密码不正确');
        }

        Database::pdo()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([hash('sha256', $new), $user['id']]);

        return ['ok' => true];
    }

    /**
     * @param array<string, mixed> $user
     */
    private static function issueToken(array $user): string
    {
        $ttl = (int) Config::get('JWT_TTL', 315360000);

        return Jwt::encode([
            'sub' => (int) $user['id'],
            'role' => $user['role'],
            'iat' => time(),
            'exp' => time() + $ttl,
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private static function mapUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'nickname' => $user['nickname'],
            'phone' => $user['phone'] ?? '',
            'role' => $user['role'],
            'createdAt' => $user['created_at'] ?? null,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Config;
use App\Database;
use App\Http\HttpException;
use App\Http\Request;
use App\Jwt;

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

        $ttl = (int) Config::get('JWT_TTL', 315360000);
        $token = Jwt::encode([
            'sub' => (int) $user['id'],
            'role' => $user['role'],
            'iat' => time(),
            'exp' => time() + $ttl,
        ]);

        return [
            'token' => $token,
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
     * @return array<string, mixed>
     */
    private static function mapUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'nickname' => $user['nickname'],
            'role' => $user['role'],
            'createdAt' => $user['created_at'] ?? null,
        ];
    }
}

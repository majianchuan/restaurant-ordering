<?php

declare(strict_types=1);

namespace App;

use App\Http\HttpException;

/**
 * 基于请求头 Authorization: Bearer <token> 的身份认证。
 */
final class Auth
{
    /** @var array<string, mixed>|null */
    private static ?array $user = null;

    private static bool $resolved = false;

    /**
     * @return array<string, mixed>|null
     */
    public static function user(): ?array
    {
        if (self::$resolved) {
            return self::$user;
        }

        self::$resolved = true;

        $token = self::bearerToken();
        if ($token === null) {
            return null;
        }

        $payload = Jwt::decode($token);
        if ($payload === null || !isset($payload['sub'])) {
            return null;
        }

        $stmt = Database::pdo()->prepare(
            'SELECT id, username, nickname, phone, role, created_at FROM users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([(int) $payload['sub']]);
        $row = $stmt->fetch();

        if ($row === false) {
            return null;
        }

        self::$user = [
            'id' => (int) $row['id'],
            'username' => $row['username'],
            'nickname' => $row['nickname'],
            'phone' => $row['phone'] ?? '',
            'role' => $row['role'],
            'createdAt' => $row['created_at'],
        ];

        return self::$user;
    }

    /**
     * @return array<string, mixed>
     */
    public static function requireUser(): array
    {
        $user = self::user();
        if ($user === null) {
            throw new HttpException(401, '请先登录');
        }

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    public static function requireRole(string ...$roles): array
    {
        $user = self::requireUser();
        if (!in_array($user['role'], $roles, true)) {
            throw new HttpException(403, '无权执行该操作');
        }

        return $user;
    }

    private static function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? null;

        if ($header === null && function_exists('getallheaders')) {
            foreach (getallheaders() as $key => $value) {
                if (strcasecmp((string) $key, 'Authorization') === 0) {
                    $header = $value;
                    break;
                }
            }
        }

        if (!is_string($header) || !preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches)) {
            return null;
        }

        return trim($matches[1]);
    }
}

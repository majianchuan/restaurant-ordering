<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Http\HttpException;
use App\Http\Request;
use App\Support\Str;

final class TableController
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function index(): array
    {
        $rows = Database::pdo()->query(
            'SELECT id, public_code, name, created_at FROM dining_tables ORDER BY id'
        )->fetchAll();

        return array_map([self::class, 'map'], $rows);
    }

    /**
     * 新增餐桌，默认名称为“当前餐桌数量 + 1”的数字加“桌”，重名则继续自增。
     *
     * @return array<string, mixed>
     */
    public static function store(): array
    {
        $pdo = Database::pdo();
        $count = (int) $pdo->query('SELECT COUNT(*) FROM dining_tables')->fetchColumn();

        $number = $count + 1;
        $check = $pdo->prepare('SELECT 1 FROM dining_tables WHERE name = ? LIMIT 1');
        while (true) {
            $name = $number . '桌';
            $check->execute([$name]);
            if ($check->fetchColumn() === false) {
                break;
            }
            $number++;
        }

        $pdo->prepare('INSERT INTO dining_tables (public_code, name) VALUES (?, ?)')
            ->execute([bin2hex(random_bytes(16)), $name]);

        $id = (int) $pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT id, public_code, name, created_at FROM dining_tables WHERE id = ?');
        $stmt->execute([$id]);

        return self::map($stmt->fetch());
    }

    /**
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function update(array $params): array
    {
        $id = (int) ($params['id'] ?? 0);
        $body = Request::json();
        $name = trim((string) ($body['name'] ?? ''));

        if ($name === '') {
            throw new HttpException(422, '请输入餐桌名称');
        }
        if (Str::length($name) > 30) {
            throw new HttpException(422, '餐桌名称不能超过 30 个字符');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id FROM dining_tables WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() === false) {
            throw new HttpException(404, '餐桌不存在');
        }

        $stmt = $pdo->prepare('SELECT id FROM dining_tables WHERE name = ? AND id <> ? LIMIT 1');
        $stmt->execute([$name, $id]);
        if ($stmt->fetchColumn() !== false) {
            throw new HttpException(409, '餐桌名称已存在');
        }

        $pdo->prepare('UPDATE dining_tables SET name = ? WHERE id = ?')->execute([$name, $id]);

        $stmt = $pdo->prepare('SELECT id, public_code, name, created_at FROM dining_tables WHERE id = ?');
        $stmt->execute([$id]);

        return self::map($stmt->fetch());
    }

    /**
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function destroy(array $params): array
    {
        $id = (int) ($params['id'] ?? 0);

        $stmt = Database::pdo()->prepare('DELETE FROM dining_tables WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            throw new HttpException(404, '餐桌不存在');
        }

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
            'name' => $row['name'],
            'publicCode' => $row['public_code'],
            'createdAt' => $row['created_at'] ?? null,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Http\HttpException;
use App\Http\Request;
use App\Support\Str;

final class MenuController
{
    /**
     * 客户与员工看到的在售菜单。
     *
     * @return array<int, array<string, mixed>>
     */
    public static function index(): array
    {
        $rows = Database::pdo()->query(
            'SELECT id, name, price, description, image_url, created_at, updated_at
             FROM menu_items
             WHERE is_active = 1
             ORDER BY id'
        )->fetchAll();

        return array_map([self::class, 'map'], $rows);
    }

    /**
     * @return array<string, mixed>
     */
    public static function store(): array
    {
        $data = self::validate();

        $pdo = Database::pdo();
        $pdo->prepare('INSERT INTO menu_items (name, price, description, image_url) VALUES (?, ?, ?, ?)')
            ->execute([$data['name'], $data['price'], $data['description'], $data['imageUrl']]);

        return self::find((int) $pdo->lastInsertId());
    }

    /**
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function update(array $params): array
    {
        $id = (int) ($params['id'] ?? 0);
        $data = self::validate();

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id FROM menu_items WHERE id = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() === false) {
            throw new HttpException(404, '菜品不存在');
        }

        $pdo->prepare(
            'UPDATE menu_items SET name = ?, price = ?, description = ?, image_url = ? WHERE id = ?'
        )->execute([$data['name'], $data['price'], $data['description'], $data['imageUrl'], $id]);

        return self::find($id);
    }

    /**
     * 软删除：保留历史订单对菜品的引用。
     *
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function destroy(array $params): array
    {
        $id = (int) ($params['id'] ?? 0);

        $stmt = Database::pdo()->prepare('UPDATE menu_items SET is_active = 0 WHERE id = ? AND is_active = 1');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            throw new HttpException(404, '菜品不存在');
        }

        return ['ok' => true];
    }

    /**
     * @return array<string, mixed>
     */
    private static function find(int $id): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT id, name, price, description, image_url, created_at, updated_at FROM menu_items WHERE id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if ($row === false) {
            throw new HttpException(404, '菜品不存在');
        }

        return self::map($row);
    }

    /**
     * @return array{name: string, price: string, description: string, imageUrl: string}
     */
    private static function validate(): array
    {
        $body = Request::json();

        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            throw new HttpException(422, '请输入菜品名称');
        }
        if (Str::length($name) > 100) {
            throw new HttpException(422, '菜品名称不能超过 100 个字符');
        }

        $priceRaw = $body['price'] ?? null;
        if (!is_numeric($priceRaw)) {
            throw new HttpException(422, '请输入正确的价格');
        }
        $price = round((float) $priceRaw, 2);
        if ($price <= 0) {
            throw new HttpException(422, '价格必须大于 0');
        }
        if ($price > 999999.99) {
            throw new HttpException(422, '价格超出允许范围');
        }

        $description = trim((string) ($body['description'] ?? ''));
        if (Str::length($description) > 500) {
            throw new HttpException(422, '描述不能超过 500 个字符');
        }

        $imageUrl = trim((string) ($body['imageUrl'] ?? ''));
        if (Str::length($imageUrl) > 500) {
            throw new HttpException(422, '图片地址过长');
        }
        if ($imageUrl !== ''
            && !preg_match('#^https?://#i', $imageUrl)
            && !str_starts_with($imageUrl, '/api/uploads/')
        ) {
            throw new HttpException(422, '图片地址必须是 http(s) 链接或已上传的图片');
        }

        return [
            'name' => $name,
            'price' => number_format($price, 2, '.', ''),
            'description' => $description,
            'imageUrl' => $imageUrl,
        ];
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
            'price' => number_format((float) $row['price'], 2, '.', ''),
            'description' => $row['description'],
            'imageUrl' => $row['image_url'],
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Http\HttpException;
use App\Http\Request;
use App\Support\Str;
use PDO;

final class MenuController
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function index(): array
    {
        $where = ['m.is_active = 1', 'c.is_active = 1'];
        $params = [];

        $categoryId = filter_var($_GET['categoryId'] ?? null, FILTER_VALIDATE_INT);
        if ($categoryId !== false && $categoryId !== null && $categoryId > 0) {
            $where[] = 'm.category_id = ?';
            $params[] = $categoryId;
        }

        $keyword = trim((string) ($_GET['keyword'] ?? ''));
        if ($keyword !== '') {
            $where[] = 'm.name LIKE ?';
            $params[] = '%' . $keyword . '%';
        }

        $stmt = Database::pdo()->prepare(
            'SELECT m.id, m.category_id, m.name, m.price, m.description, m.image_url,
                    m.created_at, m.updated_at, c.name AS category_name
             FROM menu_items m
             INNER JOIN menu_categories c ON c.id = m.category_id
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY c.id, m.id'
        );
        $stmt->execute($params);

        return array_map([self::class, 'map'], $stmt->fetchAll());
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function categories(): array
    {
        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'name' => $row['name'],
        ], Database::pdo()->query(
            'SELECT id, name FROM menu_categories WHERE is_active = 1 ORDER BY id'
        )->fetchAll());
    }

    /**
     * @return array<string, mixed>
     */
    public static function storeCategory(): array
    {
        $name = self::categoryName();
        $pdo = Database::pdo();

        $stmt = $pdo->prepare('SELECT id, is_active FROM menu_categories WHERE name = ? LIMIT 1');
        $stmt->execute([$name]);
        $existing = $stmt->fetch();

        if ($existing !== false) {
            if ((int) $existing['is_active'] === 1) {
                throw new HttpException(409, '分类已存在');
            }

            $pdo->prepare('UPDATE menu_categories SET is_active = 1 WHERE id = ?')
                ->execute([(int) $existing['id']]);

            return self::findCategory((int) $existing['id']);
        }

        $pdo->prepare('INSERT INTO menu_categories (name) VALUES (?)')->execute([$name]);

        return self::findCategory((int) $pdo->lastInsertId());
    }

    /**
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function updateCategory(array $params): array
    {
        $id = (int) ($params['id'] ?? 0);
        $name = self::categoryName();
        $pdo = Database::pdo();
        self::findCategory($id);

        $stmt = $pdo->prepare('SELECT id FROM menu_categories WHERE name = ? AND id <> ? LIMIT 1');
        $stmt->execute([$name, $id]);
        if ($stmt->fetchColumn() !== false) {
            throw new HttpException(409, '分类名称已存在');
        }

        $pdo->prepare('UPDATE menu_categories SET name = ? WHERE id = ?')->execute([$name, $id]);

        return self::findCategory($id);
    }

    /**
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function destroyCategory(array $params): array
    {
        $id = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();
        self::findCategory($id);

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM menu_items WHERE category_id = ? AND is_active = 1'
        );
        $stmt->execute([$id]);

        if ((int) $stmt->fetchColumn() > 0) {
            throw new HttpException(409, '该分类下还有菜品，不能删除');
        }

        $pdo->prepare('UPDATE menu_categories SET is_active = 0 WHERE id = ?')->execute([$id]);

        return ['ok' => true];
    }

    /**
     * @return array<string, mixed>
     */
    public static function store(): array
    {
        $data = self::validate();

        $pdo = Database::pdo();
        $pdo->prepare(
            'INSERT INTO menu_items (name, category_id, price, description, image_url)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $data['name'],
            $data['categoryId'],
            $data['price'],
            $data['description'],
            $data['imageUrl'],
        ]);

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

        $stmt = $pdo->prepare(
            'SELECT image_url FROM menu_items WHERE id = ? AND is_active = 1 LIMIT 1'
        );
        $stmt->execute([$id]);
        $oldImage = $stmt->fetchColumn();

        if ($oldImage === false) {
            throw new HttpException(404, '菜品不存在');
        }

        $pdo->prepare(
            'UPDATE menu_items SET name = ?, category_id = ?, price = ?, description = ?, image_url = ?
             WHERE id = ?'
        )->execute([
            $data['name'],
            $data['categoryId'],
            $data['price'],
            $data['description'],
            $data['imageUrl'],
            $id,
        ]);

        if ($oldImage !== '' && $oldImage !== $data['imageUrl']) {
            self::deleteImageIfUnused($pdo, $oldImage, $id);
        }

        return self::find($id);
    }

    /**
     * 删除菜品：保留历史订单引用，同时删除上传的图片文件。
     *
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function destroy(array $params): array
    {
        $id = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();

        $stmt = $pdo->prepare('SELECT image_url FROM menu_items WHERE id = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$id]);
        $imageUrl = $stmt->fetchColumn();

        if ($imageUrl === false) {
            throw new HttpException(404, '菜品不存在');
        }

        $pdo->prepare('UPDATE menu_items SET is_active = 0, image_url = ? WHERE id = ?')
            ->execute(['', $id]);

        if ($imageUrl !== '') {
            self::deleteImageIfUnused($pdo, (string) $imageUrl, $id);
        }

        return ['ok' => true];
    }

    /**
     * @return array<string, mixed>
     */
    private static function find(int $id): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT m.id, m.category_id, m.name, m.price, m.description, m.image_url,
                    m.created_at, m.updated_at, c.name AS category_name
             FROM menu_items m
             INNER JOIN menu_categories c ON c.id = m.category_id
             WHERE m.id = ? AND m.is_active = 1
             LIMIT 1'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if ($row === false) {
            throw new HttpException(404, '菜品不存在');
        }

        return self::map($row);
    }

    /**
     * @return array<string, mixed>
     */
    private static function findCategory(int $id): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT id, name FROM menu_categories WHERE id = ? AND is_active = 1 LIMIT 1'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if ($row === false) {
            throw new HttpException(404, '分类不存在');
        }

        return ['id' => (int) $row['id'], 'name' => $row['name']];
    }

    private static function categoryName(): string
    {
        $body = Request::json();
        $name = trim((string) ($body['name'] ?? ''));

        if ($name === '') {
            throw new HttpException(422, '请输入分类名称');
        }
        if (Str::length($name) > 20) {
            throw new HttpException(422, '分类名称不能超过 20 个字符');
        }

        return $name;
    }

    /**
     * @return array{name: string, categoryId: int, price: string, description: string, imageUrl: string}
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

        $categoryId = filter_var($body['categoryId'] ?? null, FILTER_VALIDATE_INT);
        if ($categoryId === false || $categoryId <= 0) {
            throw new HttpException(422, '请选择菜品分类');
        }
        try {
            self::findCategory($categoryId);
        } catch (HttpException) {
            throw new HttpException(422, '请选择正确的菜品分类');
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
        if ($imageUrl !== '') {
            if (!preg_match('#^/api/uploads/[A-Za-z0-9][A-Za-z0-9._-]*$#', $imageUrl)) {
                throw new HttpException(422, '图片地址无效，请重新上传图片');
            }

            $filename = basename($imageUrl);
            if (!is_file(UPLOAD_PATH . DIRECTORY_SEPARATOR . $filename)) {
                throw new HttpException(422, '图片文件不存在，请重新上传');
            }
        }

        return [
            'name' => $name,
            'categoryId' => $categoryId,
            'price' => number_format($price, 2, '.', ''),
            'description' => $description,
            'imageUrl' => $imageUrl,
        ];
    }

    /**
     * 删除只属于该菜品的上传图片；演示 SVG 也按同一规则处理。
     */
    private static function deleteImageIfUnused(PDO $pdo, string $imageUrl, int $menuId): void
    {
        if (!str_starts_with($imageUrl, '/api/uploads/')) {
            return;
        }

        $filename = basename($imageUrl);
        if ($filename === '' || !preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $filename)) {
            return;
        }

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM menu_items WHERE image_url = ? AND id <> ?');
        $stmt->execute([$imageUrl, $menuId]);
        if ((int) $stmt->fetchColumn() > 0) {
            return;
        }

        $path = UPLOAD_PATH . DIRECTORY_SEPARATOR . $filename;
        $uploadRoot = realpath(UPLOAD_PATH);
        $realPath = realpath($path);

        if ($uploadRoot !== false && $realPath !== false
            && str_starts_with($realPath, $uploadRoot . DIRECTORY_SEPARATOR)
            && is_file($realPath)
        ) {
            @unlink($realPath);
        }
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function map(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'categoryId' => (int) $row['category_id'],
            'category' => $row['category_name'] ?? '',
            'name' => $row['name'],
            'price' => number_format((float) $row['price'], 2, '.', ''),
            'description' => $row['description'],
            'imageUrl' => $row['image_url'],
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }
}

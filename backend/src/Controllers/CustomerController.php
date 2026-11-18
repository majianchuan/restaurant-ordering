<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Http\HttpException;
use App\Http\Request;
use App\Support\Str;

final class CustomerController
{
    /**
     * 我的收藏。
     *
     * @return array<int, array<string, mixed>>
     */
    public static function favorites(): array
    {
        $user = Auth::requireRole('customer');

        $stmt = Database::pdo()->prepare(
            'SELECT m.id, m.name, m.category, m.price, m.description, m.image_url,
                    m.created_at, m.updated_at, f.created_at AS favorited_at,
                    (SELECT COALESCE(ROUND(AVG(r.rating), 1), 0)
                       FROM reviews r WHERE r.menu_item_id = m.id) AS rating,
                    (SELECT COUNT(*) FROM reviews r WHERE r.menu_item_id = m.id) AS review_count
             FROM favorites f
             INNER JOIN menu_items m ON m.id = f.menu_item_id
             WHERE f.user_id = ? AND m.is_active = 1
             ORDER BY f.id DESC'
        );
        $stmt->execute([$user['id']]);

        return array_map(static function (array $row): array {
            $item = MenuController::map($row);
            $item['favoritedAt'] = $row['favorited_at'];

            return $item;
        }, $stmt->fetchAll());
    }

    /**
     * 收藏 / 取消收藏。
     *
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function toggleFavorite(array $params): array
    {
        $user = Auth::requireRole('customer');
        $menuItemId = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();

        $stmt = $pdo->prepare('SELECT id FROM menu_items WHERE id = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$menuItemId]);
        if ($stmt->fetchColumn() === false) {
            throw new HttpException(404, '菜品不存在');
        }

        $stmt = $pdo->prepare('SELECT id FROM favorites WHERE user_id = ? AND menu_item_id = ? LIMIT 1');
        $stmt->execute([$user['id'], $menuItemId]);
        $favoriteId = $stmt->fetchColumn();

        if ($favoriteId !== false) {
            $pdo->prepare('DELETE FROM favorites WHERE id = ?')->execute([(int) $favoriteId]);

            return ['favorited' => false];
        }

        $pdo->prepare('INSERT INTO favorites (user_id, menu_item_id) VALUES (?, ?)')
            ->execute([$user['id'], $menuItemId]);

        return ['favorited' => true];
    }

    /**
     * 我的评价。
     *
     * @return array<int, array<string, mixed>>
     */
    public static function myReviews(): array
    {
        $user = Auth::requireRole('customer');

        $stmt = Database::pdo()->prepare(
            'SELECT r.id, r.order_id, r.menu_item_id, r.rating, r.content, r.created_at,
                    m.name AS menu_name, m.image_url
             FROM reviews r
             INNER JOIN menu_items m ON m.id = r.menu_item_id
             WHERE r.user_id = ?
             ORDER BY r.id DESC'
        );
        $stmt->execute([$user['id']]);

        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'orderId' => (int) $row['order_id'],
            'menuItemId' => (int) $row['menu_item_id'],
            'menuName' => $row['menu_name'],
            'imageUrl' => $row['image_url'],
            'rating' => (int) $row['rating'],
            'content' => $row['content'],
            'createdAt' => $row['created_at'],
        ], $stmt->fetchAll());
    }

    /**
     * 对已结账订单中的某个菜品发表评价。
     *
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function createReview(array $params): array
    {
        $user = Auth::requireRole('customer');
        $orderId = (int) ($params['id'] ?? 0);
        $body = Request::json();
        $menuItemId = (int) ($body['menuItemId'] ?? 0);
        $rating = (int) ($body['rating'] ?? 0);
        $content = trim((string) ($body['content'] ?? ''));

        if ($rating < 1 || $rating > 5) {
            throw new HttpException(422, '评分需为 1-5 星');
        }
        if (Str::length($content) > 500) {
            throw new HttpException(422, '评价内容不能超过 500 个字符');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, status FROM orders WHERE id = ? AND customer_id = ? LIMIT 1'
        );
        $stmt->execute([$orderId, $user['id']]);
        $order = $stmt->fetch();

        if ($order === false) {
            throw new HttpException(404, '订单不存在');
        }
        if ($order['status'] !== 'paid') {
            throw new HttpException(409, '订单结账后才能评价');
        }

        $stmt = $pdo->prepare(
            'SELECT id FROM order_items WHERE order_id = ? AND menu_item_id = ? LIMIT 1'
        );
        $stmt->execute([$orderId, $menuItemId]);
        if ($stmt->fetchColumn() === false) {
            throw new HttpException(422, '该订单中没有这个菜品');
        }

        $stmt = $pdo->prepare(
            'SELECT id FROM reviews WHERE order_id = ? AND menu_item_id = ? LIMIT 1'
        );
        $stmt->execute([$orderId, $menuItemId]);
        if ($stmt->fetchColumn() !== false) {
            throw new HttpException(409, '该菜品已经评价过了');
        }

        $pdo->prepare(
            'INSERT INTO reviews (order_id, user_id, menu_item_id, rating, content) VALUES (?, ?, ?, ?, ?)'
        )->execute([$orderId, $user['id'], $menuItemId, $rating, $content]);

        $id = (int) $pdo->lastInsertId();
        $stmt = $pdo->prepare(
            'SELECT r.*, m.name AS menu_name
             FROM reviews r INNER JOIN menu_items m ON m.id = r.menu_item_id
             WHERE r.id = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        $review = $stmt->fetch();

        return [
            'id' => (int) $review['id'],
            'orderId' => (int) $review['order_id'],
            'menuItemId' => (int) $review['menu_item_id'],
            'menuName' => $review['menu_name'],
            'rating' => (int) $review['rating'],
            'content' => $review['content'],
            'createdAt' => $review['created_at'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Http\HttpException;
use App\Http\Request;
use Throwable;

final class OrderController
{
    /**
     * 后厨 / 收银页面使用：所有餐桌及其最近一次的订单。
     *
     * @return array<int, array<string, mixed>>
     */
    public static function overview(): array
    {
        $pdo = Database::pdo();

        $tables = $pdo->query(
            'SELECT id, name, public_code FROM dining_tables ORDER BY id'
        )->fetchAll();

        $orderRows = $pdo->query(
            'SELECT o.id, o.table_id, o.status, o.created_at, o.updated_at, o.paid_at
             FROM orders o
             INNER JOIN (
                 SELECT table_id, MAX(id) AS max_id
                 FROM orders
                 GROUP BY table_id
             ) latest ON latest.max_id = o.id'
        )->fetchAll();

        $ordersByTable = [];
        if ($orderRows !== []) {
            $itemsByOrder = self::itemsByOrder(array_map(
                static fn (array $row): int => (int) $row['id'],
                $orderRows
            ));

            foreach ($orderRows as $row) {
                $ordersByTable[(int) $row['table_id']] = self::buildOrder(
                    $row,
                    $itemsByOrder[(int) $row['id']] ?? []
                );
            }
        }

        $result = [];
        foreach ($tables as $table) {
            $result[] = [
                'id' => (int) $table['id'],
                'name' => $table['name'],
                'publicCode' => $table['public_code'],
                'order' => $ordersByTable[(int) $table['id']] ?? null,
            ];
        }

        return $result;
    }

    /**
     * 客户扫码后读取当前未结账订单。
     *
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function tableOrder(array $params): array
    {
        $table = self::findTableByCode($params['code'] ?? '');
        $order = self::findPendingOrder((int) $table['id']);

        return [
            'table' => self::mapTable($table),
            'order' => $order === null
                ? null
                : self::buildOrder(
                    $order,
                    self::itemsByOrder([(int) $order['id']])[(int) $order['id']] ?? []
                ),
        ];
    }

    /**
     * 客户提交订单：已存在未结账订单时整体覆盖，否则新建订单。
     *
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function submit(array $params): array
    {
        $table = self::findTableByCode($params['code'] ?? '');
        $tableId = (int) $table['id'];
        $body = Request::json();
        $rawItems = $body['items'] ?? null;

        if (!is_array($rawItems)) {
            throw new HttpException(422, '订单内容格式不正确');
        }

        $quantities = [];
        foreach ($rawItems as $rawItem) {
            if (!is_array($rawItem)) {
                throw new HttpException(422, '订单内容格式不正确');
            }

            $menuItemId = filter_var($rawItem['menuItemId'] ?? null, FILTER_VALIDATE_INT);
            $quantity = filter_var($rawItem['quantity'] ?? null, FILTER_VALIDATE_INT);

            if ($menuItemId === false || $menuItemId <= 0) {
                throw new HttpException(422, '订单中存在无效的菜品');
            }

            if ($quantity === false || $quantity <= 0) {
                continue;
            }

            $quantities[$menuItemId] = ($quantities[$menuItemId] ?? 0) + $quantity;
        }

        if ($quantities === []) {
            throw new HttpException(422, '请至少选择一道菜');
        }

        foreach ($quantities as $quantity) {
            if ($quantity > 999) {
                throw new HttpException(422, '单个菜品数量不能超过 999');
            }
        }

        $menuIds = array_keys($quantities);
        $placeholders = implode(',', array_fill(0, count($menuIds), '?'));
        $stmt = Database::pdo()->prepare(
            "SELECT id FROM menu_items WHERE is_active = 1 AND id IN ($placeholders)"
        );
        $stmt->execute($menuIds);
        $found = array_map('intval', array_column($stmt->fetchAll(), 'id'));

        if (array_diff($menuIds, $found) !== []) {
            throw new HttpException(422, '部分菜品已下架，请刷新菜单后重试');
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            // 锁住餐桌行，串行化同一餐桌的并发提交。
            $lock = $pdo->prepare('SELECT id FROM dining_tables WHERE id = ? FOR UPDATE');
            $lock->execute([$tableId]);

            $stmt = $pdo->prepare(
                "SELECT * FROM orders WHERE table_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1 FOR UPDATE"
            );
            $stmt->execute([$tableId]);
            $order = $stmt->fetch();

            $oldItems = [];

            if ($order !== false) {
                $orderId = (int) $order['id'];

                $stmt = $pdo->prepare('SELECT menu_item_id, quantity, is_done FROM order_items WHERE order_id = ?');
                $stmt->execute([$orderId]);
                foreach ($stmt->fetchAll() as $oldItem) {
                    $oldItems[(int) $oldItem['menu_item_id']] = $oldItem;
                }

                $pdo->prepare('DELETE FROM order_items WHERE order_id = ?')->execute([$orderId]);
                $pdo->prepare('UPDATE orders SET updated_at = NOW() WHERE id = ?')->execute([$orderId]);
            } else {
                $pdo->prepare('INSERT INTO orders (table_id, pending_table_id) VALUES (?, ?)')
                    ->execute([$tableId, $tableId]);
                $orderId = (int) $pdo->lastInsertId();
            }

            $insert = $pdo->prepare(
                'INSERT INTO order_items (order_id, menu_item_id, quantity, is_done) VALUES (?, ?, ?, ?)'
            );

            foreach ($quantities as $menuItemId => $quantity) {
                $done = 0;
                $previous = $oldItems[$menuItemId] ?? null;
                if ($previous !== null && (int) $previous['quantity'] === $quantity) {
                    $done = (int) $previous['is_done'];
                }
                $insert->execute([$orderId, $menuItemId, $quantity, $done]);
            }

            $pdo->commit();
        } catch (Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $exception;
        }

        $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        return [
            'table' => self::mapTable($table),
            'order' => self::buildOrder($order, self::itemsByOrder([$orderId])[$orderId] ?? []),
        ];
    }

    /**
     * 厨师标记某个菜是否做好。
     *
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function toggleItem(array $params): array
    {
        $id = (int) ($params['id'] ?? 0);
        $body = Request::json();
        $done = filter_var($body['done'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT oi.id, o.status
             FROM order_items oi
             INNER JOIN orders o ON o.id = oi.order_id
             WHERE oi.id = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        $item = $stmt->fetch();

        if ($item === false) {
            throw new HttpException(404, '菜品记录不存在');
        }

        if ($item['status'] === 'paid') {
            throw new HttpException(409, '订单已结账，不能修改菜品状态');
        }

        $pdo->prepare('UPDATE order_items SET is_done = ? WHERE id = ?')
            ->execute([$done ? 1 : 0, $id]);

        return ['ok' => true, 'id' => $id, 'done' => $done];
    }

    /**
     * 收银员结账：订单标记为已结账，所有菜品视为已做好。
     *
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function pay(array $params): array
    {
        $id = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();

        $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $order = $stmt->fetch();

        if ($order === false) {
            throw new HttpException(404, '订单不存在');
        }

        if ($order['status'] === 'paid') {
            throw new HttpException(409, '该订单已结账');
        }

        $pdo->beginTransaction();

        try {
            $update = $pdo->prepare(
                "UPDATE orders SET status = 'paid', paid_at = NOW(), pending_table_id = NULL, updated_at = NOW()
                 WHERE id = ? AND status = 'pending'"
            );
            $update->execute([$id]);

            if ($update->rowCount() === 0) {
                throw new HttpException(409, '该订单已结账');
            }

            $pdo->prepare('UPDATE order_items SET is_done = 1 WHERE order_id = ?')->execute([$id]);
            $pdo->commit();
        } catch (Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $exception;
        }

        $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$id]);
        $order = $stmt->fetch();

        return self::buildOrder($order, self::itemsByOrder([$id])[$id] ?? []);
    }

    /**
     * @param array<string, mixed> $table
     * @return array<string, mixed>
     */
    private static function mapTable(array $table): array
    {
        return [
            'id' => (int) $table['id'],
            'name' => $table['name'],
            'publicCode' => $table['public_code'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function findTableByCode(string $code): array
    {
        $code = strtolower(trim($code));
        if (!preg_match('/^[a-f0-9]{32}$/', $code)) {
            throw new HttpException(404, '餐桌不存在或二维码无效');
        }

        $stmt = Database::pdo()->prepare(
            'SELECT id, name, public_code FROM dining_tables WHERE public_code = ? LIMIT 1'
        );
        $stmt->execute([$code]);
        $table = $stmt->fetch();

        if ($table === false) {
            throw new HttpException(404, '餐桌不存在或二维码无效');
        }

        return $table;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function findPendingOrder(int $tableId): ?array
    {
        $stmt = Database::pdo()->prepare(
            "SELECT * FROM orders WHERE table_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute([$tableId]);
        $order = $stmt->fetch();

        return $order === false ? null : $order;
    }

    /**
     * @param array<int, int> $orderIds
     * @return array<int, array<int, array<string, mixed>>>
     */
    private static function itemsByOrder(array $orderIds): array
    {
        if ($orderIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
        $stmt = Database::pdo()->prepare(
            "SELECT oi.id, oi.order_id, oi.menu_item_id, oi.quantity, oi.is_done, m.name, m.price
             FROM order_items oi
             INNER JOIN menu_items m ON m.id = oi.menu_item_id
             WHERE oi.order_id IN ($placeholders)
             ORDER BY oi.id"
        );
        $stmt->execute($orderIds);

        $grouped = [];
        foreach ($stmt->fetchAll() as $row) {
            $grouped[(int) $row['order_id']][] = $row;
        }

        return $grouped;
    }

    /**
     * @param array<string, mixed> $order
     * @param array<int, array<string, mixed>> $items
     * @return array<string, mixed>
     */
    private static function buildOrder(array $order, array $items): array
    {
        $paid = $order['status'] === 'paid';
        $totalAmount = 0.0;
        $totalQuantity = 0;
        $doneCount = 0;
        $undoneCount = 0;
        $mappedItems = [];

        foreach ($items as $item) {
            $quantity = (int) $item['quantity'];
            $price = (float) $item['price'];
            $done = (bool) $item['is_done'];

            $totalAmount += $price * $quantity;
            $totalQuantity += $quantity;

            if (!$paid) {
                if ($done) {
                    $doneCount += $quantity;
                } else {
                    $undoneCount += $quantity;
                }
            }

            $mappedItems[] = [
                'id' => (int) $item['id'],
                'menuItemId' => (int) $item['menu_item_id'],
                'name' => $item['name'],
                'price' => number_format($price, 2, '.', ''),
                'quantity' => $quantity,
                'done' => $done,
            ];
        }

        return [
            'id' => (int) $order['id'],
            'tableId' => (int) $order['table_id'],
            'status' => $order['status'],
            'createdAt' => $order['created_at'],
            'updatedAt' => $order['updated_at'],
            'paidAt' => $order['paid_at'],
            'totalAmount' => number_format($totalAmount, 2, '.', ''),
            'totalQuantity' => $totalQuantity,
            'doneCount' => $doneCount,
            'undoneCount' => $undoneCount,
            'items' => $mappedItems,
        ];
    }
}

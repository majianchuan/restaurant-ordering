<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;

final class AdminController
{
    /**
     * 订单检索：关键词、状态筛选、分页。
     *
     * @return array<string, mixed>
     */
    public static function orders(): array
    {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $pageSize = (int) ($_GET['pageSize'] ?? 10);
        $pageSize = max(5, min(50, $pageSize));
        $status = trim((string) ($_GET['status'] ?? ''));
        $keyword = trim((string) ($_GET['keyword'] ?? ''));

        $where = [];
        $params = [];

        if (in_array($status, ['pending', 'paid'], true)) {
            $where[] = 'o.status = ?';
            $params[] = $status;
        }

        if ($keyword !== '') {
            if (ctype_digit($keyword)) {
                $where[] = '(o.id = ? OR t.name LIKE ?)';
                $params[] = (int) $keyword;
                $params[] = '%' . $keyword . '%';
            } else {
                $where[] = 't.name LIKE ?';
                $params[] = '%' . $keyword . '%';
            }
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $countSql = 'SELECT COUNT(*) FROM orders o
                     INNER JOIN dining_tables t ON t.id = o.table_id' . $whereSql;
        $stmt = Database::pdo()->prepare($countSql);
        $stmt->execute($params);
        $total = (int) $stmt->fetchColumn();

        $offset = ($page - 1) * $pageSize;
        $sql = "SELECT o.id, o.status, o.created_at, o.paid_at,
                       t.name AS table_name,
                       COALESCE(SUM(oi.quantity * m.price), 0) AS total_amount,
                       COALESCE(SUM(oi.quantity), 0) AS total_quantity
                FROM orders o
                INNER JOIN dining_tables t ON t.id = o.table_id
                LEFT JOIN order_items oi ON oi.order_id = o.id
                LEFT JOIN menu_items m ON m.id = oi.menu_item_id
                {$whereSql}
                GROUP BY o.id, o.status, o.created_at, o.paid_at, t.name
                ORDER BY o.id DESC
                LIMIT {$pageSize} OFFSET {$offset}";

        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($params);

        $items = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'status' => $row['status'],
            'tableName' => $row['table_name'],
            'totalAmount' => number_format((float) $row['total_amount'], 2, '.', ''),
            'totalQuantity' => (int) $row['total_quantity'],
            'createdAt' => $row['created_at'],
            'paidAt' => $row['paid_at'],
        ], $stmt->fetchAll());

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
            'pages' => (int) ceil($total / $pageSize),
        ];
    }

    /**
     * 订单详情。
     *
     * @param array<string, string> $params
     * @return array<string, mixed>
     */
    public static function orderDetail(array $params): array
    {
        return OrderController::detail($params);
    }

    /**
     * 管理后台数据统计。
     *
     * @return array<string, mixed>
     */
    public static function stats(): array
    {
        $pdo = Database::pdo();

        $todayRevenue = (float) $pdo->query(
            "SELECT COALESCE(SUM(oi.quantity * m.price), 0)
             FROM orders o
             INNER JOIN order_items oi ON oi.order_id = o.id
             INNER JOIN menu_items m ON m.id = oi.menu_item_id
             WHERE o.status = 'paid' AND DATE(o.paid_at) = CURDATE()"
        )->fetchColumn();

        $todayOrders = (int) $pdo->query(
            'SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()'
        )->fetchColumn();

        $activeOrders = (int) $pdo->query(
            "SELECT COUNT(*) FROM orders WHERE status = 'pending'"
        )->fetchColumn();

        $menuCount = (int) $pdo->query(
            'SELECT COUNT(*) FROM menu_items WHERE is_active = 1'
        )->fetchColumn();

        $tableCount = (int) $pdo->query('SELECT COUNT(*) FROM dining_tables')->fetchColumn();
        $categoryCount = (int) $pdo->query(
            'SELECT COUNT(*) FROM menu_categories WHERE is_active = 1'
        )->fetchColumn();

        $stmt = $pdo->query(
            "SELECT DATE(o.paid_at) AS day,
                    COUNT(DISTINCT o.id) AS orders,
                    COALESCE(SUM(oi.quantity * m.price), 0) AS revenue
             FROM orders o
             INNER JOIN order_items oi ON oi.order_id = o.id
             INNER JOIN menu_items m ON m.id = oi.menu_item_id
             WHERE o.status = 'paid' AND o.paid_at >= CURDATE() - INTERVAL 6 DAY
             GROUP BY DATE(o.paid_at)"
        );
        $byDay = [];
        foreach ($stmt->fetchAll() as $row) {
            $byDay[$row['day']] = $row;
        }

        $week = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} day"));
            $row = $byDay[$date] ?? null;
            $week[] = [
                'date' => $date,
                'label' => date('m-d', strtotime($date)),
                'orders' => $row ? (int) $row['orders'] : 0,
                'revenue' => $row ? number_format((float) $row['revenue'], 2, '.', '') : '0.00',
            ];
        }

        $topDishes = array_map(static fn (array $row): array => [
            'name' => $row['name'],
            'quantity' => (int) $row['quantity'],
            'revenue' => number_format((float) $row['revenue'], 2, '.', ''),
        ], $pdo->query(
            "SELECT m.name, SUM(oi.quantity) AS quantity, SUM(oi.quantity * m.price) AS revenue
             FROM orders o
             INNER JOIN order_items oi ON oi.order_id = o.id
             INNER JOIN menu_items m ON m.id = oi.menu_item_id
             WHERE o.status = 'paid'
             GROUP BY m.id, m.name
             ORDER BY quantity DESC
             LIMIT 5"
        )->fetchAll());

        $statusCounts = ['pending' => 0, 'paid' => 0];
        foreach ($pdo->query('SELECT status, COUNT(*) AS total FROM orders GROUP BY status')->fetchAll() as $row) {
            $statusCounts[$row['status']] = (int) $row['total'];
        }

        return [
            'today' => [
                'revenue' => number_format($todayRevenue, 2, '.', ''),
                'orders' => $todayOrders,
                'activeOrders' => $activeOrders,
            ],
            'counts' => [
                'menu' => $menuCount,
                'tables' => $tableCount,
                'categories' => $categoryCount,
            ],
            'statusCounts' => $statusCounts,
            'week' => $week,
            'topDishes' => $topDishes,
        ];
    }
}

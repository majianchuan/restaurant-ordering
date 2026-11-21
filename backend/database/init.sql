-- Restaurant Ordering 一键初始化脚本（建库 + 建表 + 种子数据）
-- 使用：mysql --default-character-set=utf8mb4 -u root -p < backend/database/init.sql

CREATE DATABASE IF NOT EXISTS `restaurant_ordering` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `restaurant_ordering`;

-- Restaurant Ordering 数据库结构（按项目开发文档最终版）
-- 由 backend/src/Support/Installer.php 在首次启动时自动执行

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL COMMENT 'password_hash() 生成的密码哈希',
    role ENUM('manager', 'chef', 'cashier') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username),
    KEY idx_users_role (role)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dining_tables (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_code CHAR(32) NOT NULL COMMENT '二维码中的固定标识，改名不影响',
    name VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_dining_tables_name (name),
    UNIQUE KEY uk_dining_tables_public_code (public_code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_categories (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(20) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '删除分类时置 0',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_menu_categories_name (name),
    KEY idx_menu_categories_active (is_active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id INT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    image_url VARCHAR(500) NOT NULL DEFAULT '',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '删除菜品时置 0，保留历史订单引用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_menu_items_active (is_active),
    KEY idx_menu_items_category (category_id),
    CONSTRAINT fk_menu_items_category FOREIGN KEY (category_id) REFERENCES menu_categories (id),
    CONSTRAINT chk_menu_items_price CHECK (price >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    table_id INT UNSIGNED NOT NULL,
    status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paid_at DATETIME NULL,
    pending_table_id INT UNSIGNED NULL COMMENT '未结账时等于 table_id，结账后置 NULL，配合唯一索引保证每桌只有一个未结账订单',
    PRIMARY KEY (id),
    UNIQUE KEY uk_orders_pending_table (pending_table_id),
    KEY idx_orders_table (table_id),
    KEY idx_orders_status (status),
    KEY idx_orders_created (created_at),
    KEY idx_orders_paid (paid_at),
    CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES dining_tables (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id INT UNSIGNED NOT NULL,
    menu_item_id INT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    is_done TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_items_order_menu (order_id, menu_item_id),
    KEY idx_order_items_menu (menu_item_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items (id),
    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;


-- 种子数据
-- 自动导出的种子数据（请先执行 schema.sql）
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- users
INSERT INTO `users` (`id`, `username`, `nickname`, `password_hash`, `role`, `created_at`) VALUES ('1', 'admin', '店长0001', '$2y$12$PhyRRpOqqMh0aKqqWGASKeKw8265Id6Azg1yRHtUz.Z9kPS51/bmy', 'manager', '2026-11-21 04:04:43');
INSERT INTO `users` (`id`, `username`, `nickname`, `password_hash`, `role`, `created_at`) VALUES ('2', 'chef01', '厨师0001', '$2y$12$PhyRRpOqqMh0aKqqWGASKeKw8265Id6Azg1yRHtUz.Z9kPS51/bmy', 'chef', '2026-11-21 04:04:43');
INSERT INTO `users` (`id`, `username`, `nickname`, `password_hash`, `role`, `created_at`) VALUES ('3', 'cashier01', '收银员0001', '$2y$12$PhyRRpOqqMh0aKqqWGASKeKw8265Id6Azg1yRHtUz.Z9kPS51/bmy', 'cashier', '2026-11-21 04:04:43');

-- dining_tables
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES ('1', '2653bbda65efda6fd28f3156cc50bb7c', '1桌', '2026-11-21 04:04:43');
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES ('2', '2599bb7b8628285bfdce43ab8aeacb25', '2桌', '2026-11-21 04:04:43');
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES ('3', '9f65f8e384364592b875d9e5270e753c', '3桌', '2026-11-21 04:04:43');
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES ('4', '404a3dfb148f03f70eb61f9ab84aebce', '4桌', '2026-11-21 04:04:43');
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES ('5', '529379a254833227f2f763278a5b25aa', '5桌', '2026-11-21 04:04:43');
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES ('6', 'b86df03f8925e77f5d0ff50291c7f323', '6桌', '2026-11-21 04:04:43');

-- menu_categories
INSERT INTO `menu_categories` (`id`, `name`, `is_active`, `created_at`) VALUES ('1', '热菜', '1', '2026-11-21 04:04:43');
INSERT INTO `menu_categories` (`id`, `name`, `is_active`, `created_at`) VALUES ('2', '凉菜', '1', '2026-11-21 04:04:43');
INSERT INTO `menu_categories` (`id`, `name`, `is_active`, `created_at`) VALUES ('3', '素菜', '1', '2026-11-21 04:04:43');
INSERT INTO `menu_categories` (`id`, `name`, `is_active`, `created_at`) VALUES ('4', '主食', '1', '2026-11-21 04:04:43');
INSERT INTO `menu_categories` (`id`, `name`, `is_active`, `created_at`) VALUES ('5', '汤品', '1', '2026-11-21 04:04:43');
INSERT INTO `menu_categories` (`id`, `name`, `is_active`, `created_at`) VALUES ('6', '饮品', '1', '2026-11-21 04:04:43');

-- menu_items
INSERT INTO `menu_items` (`id`, `category_id`, `name`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES ('1', '1', '宫保鸡丁', '38.00', '花生与鸡丁的经典搭配，酸甜微辣，下饭首选', '/api/uploads/seed-gongbao.svg', '1', '2026-11-21 04:04:43', '2026-11-21 04:04:43');
INSERT INTO `menu_items` (`id`, `category_id`, `name`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES ('2', '1', '麻婆豆腐', '26.00', '麻辣鲜香的嫩豆腐，川味十足', '/api/uploads/seed-mapo.svg', '1', '2026-11-21 04:04:43', '2026-11-21 04:04:43');
INSERT INTO `menu_items` (`id`, `category_id`, `name`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES ('3', '1', '鱼香肉丝', '32.00', '咸甜酸辣兼备，经典下饭菜', '/api/uploads/seed-yuxiang.svg', '1', '2026-11-21 04:04:43', '2026-11-21 04:04:43');
INSERT INTO `menu_items` (`id`, `category_id`, `name`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES ('4', '3', '清炒时蔬', '18.00', '当季新鲜蔬菜，清爽解腻', '/api/uploads/seed-shucai.svg', '1', '2026-11-21 04:04:43', '2026-11-21 04:04:43');
INSERT INTO `menu_items` (`id`, `category_id`, `name`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES ('5', '2', '凉拌黄瓜', '16.00', '清脆爽口，蒜香开胃', '/api/uploads/seed-huanggua.svg', '1', '2026-11-21 04:04:43', '2026-11-21 04:04:43');
INSERT INTO `menu_items` (`id`, `category_id`, `name`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES ('6', '5', '番茄蛋汤', '12.00', '酸甜开胃的家常靓汤', '/api/uploads/seed-tang.svg', '1', '2026-11-21 04:04:43', '2026-11-21 04:04:43');
INSERT INTO `menu_items` (`id`, `category_id`, `name`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES ('7', '4', '米饭', '2.00', '东北大米，粒粒分明', '/api/uploads/seed-mifan.svg', '1', '2026-11-21 04:04:43', '2026-11-21 04:04:43');
INSERT INTO `menu_items` (`id`, `category_id`, `name`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES ('8', '6', '酸梅汤', '8.00', '冰镇酸梅汤，解腻消暑', '/api/uploads/seed-suanmei.svg', '1', '2026-11-21 04:04:43', '2026-11-21 04:04:43');

-- orders
INSERT INTO `orders` (`id`, `table_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES ('1', '1', 'pending', '2026-11-21 11:52:43', '2026-11-21 11:52:43', NULL, '1');
INSERT INTO `orders` (`id`, `table_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES ('2', '2', 'pending', '2026-11-21 11:39:43', '2026-11-21 11:39:43', NULL, '2');
INSERT INTO `orders` (`id`, `table_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES ('3', '3', 'paid', '2026-11-21 10:54:43', '2026-11-21 11:09:43', '2026-11-21 11:09:43', NULL);
INSERT INTO `orders` (`id`, `table_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES ('4', '4', 'paid', '2026-11-20 10:04:43', '2026-11-20 11:04:43', '2026-11-20 11:04:43', NULL);
INSERT INTO `orders` (`id`, `table_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES ('5', '5', 'paid', '2026-11-18 12:04:43', '2026-11-18 12:19:43', '2026-11-18 12:19:43', NULL);

-- order_items
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES ('1', '1', '1', '2', '1');
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES ('2', '1', '2', '1', '0');
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES ('3', '2', '2', '1', '1');
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES ('4', '2', '7', '2', '1');
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES ('5', '3', '3', '1', '1');
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES ('6', '3', '6', '1', '1');
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES ('7', '4', '4', '1', '1');
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES ('8', '4', '7', '2', '1');
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES ('9', '5', '5', '2', '1');
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES ('10', '5', '8', '2', '1');

SET FOREIGN_KEY_CHECKS=1;

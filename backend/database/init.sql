-- Restaurant Ordering 一键初始化脚本（建库 + 建表 + 种子数据）
-- 使用：mysql --default-character-set=utf8mb4 -u root -p < backend/database/init.sql

CREATE DATABASE IF NOT EXISTS `restaurant_ordering` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `restaurant_ordering`;

-- Restaurant Ordering 数据库结构（期末最终版）
-- 由 backend/src/Support/Installer.php 在首次启动时自动执行

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    password_hash CHAR(64) NOT NULL COMMENT 'SHA-256 哈希值',
    phone VARCHAR(20) NOT NULL DEFAULT '',
    role ENUM('manager', 'chef', 'cashier', 'customer') NOT NULL,
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

CREATE TABLE IF NOT EXISTS menu_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL DEFAULT '热菜',
    price DECIMAL(10, 2) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    image_url VARCHAR(500) NOT NULL DEFAULT '',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '删除时置 0，保留历史订单引用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_menu_items_active (is_active),
    KEY idx_menu_items_category (category),
    CONSTRAINT chk_menu_items_price CHECK (price >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    table_id INT UNSIGNED NOT NULL,
    customer_id INT UNSIGNED NULL COMMENT '顾客账户，游客下单时为空',
    status ENUM('pending', 'served', 'paid') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paid_at DATETIME NULL,
    pending_table_id INT UNSIGNED NULL COMMENT '未结账时等于 table_id，结账后置 NULL，配合唯一索引保证每桌只有一个未结账订单',
    PRIMARY KEY (id),
    UNIQUE KEY uk_orders_pending_table (pending_table_id),
    KEY idx_orders_table (table_id),
    KEY idx_orders_customer (customer_id),
    KEY idx_orders_status (status),
    KEY idx_orders_created (created_at),
    KEY idx_orders_paid (paid_at),
    CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES dining_tables (id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS favorites (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    menu_item_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_favorites_user_menu (user_id, menu_item_id),
    KEY idx_favorites_menu (menu_item_id),
    CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_favorites_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    menu_item_id INT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL COMMENT '1-5 星',
    content VARCHAR(500) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_reviews_order_menu (order_id, menu_item_id),
    KEY idx_reviews_user (user_id),
    KEY idx_reviews_menu (menu_item_id),
    KEY idx_reviews_created (created_at),
    CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE CASCADE,
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;


-- 种子数据
/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

/*!40000 ALTER TABLE `dining_tables` DISABLE KEYS */;
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES (1,'49633b3a8bfd0d52a0d77049ededf61d','1桌','2026-11-18 19:05:25');
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES (2,'c6ab7a8f5acd5c1200bcc7264c84f273','2桌','2026-11-18 19:05:25');
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES (3,'d9847217b2958278d9c8ca9a28a348ea','3桌','2026-11-18 19:05:25');
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES (4,'bad0f884e39d6d5ce5eb6f975f8f647e','4桌','2026-11-18 19:05:25');
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES (5,'3e3edb15e84dadf192fb2aa0740b409d','5桌','2026-11-18 19:05:25');
INSERT INTO `dining_tables` (`id`, `public_code`, `name`, `created_at`) VALUES (6,'8ff344a777f53659d53ce73d0f5e5cbd','6桌','2026-11-18 19:05:25');
/*!40000 ALTER TABLE `dining_tables` ENABLE KEYS */;

/*!40000 ALTER TABLE `favorites` DISABLE KEYS */;
INSERT INTO `favorites` (`id`, `user_id`, `menu_item_id`, `created_at`) VALUES (1,4,1,'2026-11-18 19:05:25');
INSERT INTO `favorites` (`id`, `user_id`, `menu_item_id`, `created_at`) VALUES (2,4,8,'2026-11-18 19:05:25');
/*!40000 ALTER TABLE `favorites` ENABLE KEYS */;

/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` (`id`, `name`, `category`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES (1,'宫保鸡丁','热菜',38.00,'花生与鸡丁的经典搭配，酸甜微辣，下饭首选','/api/uploads/seed-gongbao.svg',1,'2026-11-18 19:05:25','2026-11-18 19:05:25');
INSERT INTO `menu_items` (`id`, `name`, `category`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES (2,'麻婆豆腐','热菜',26.00,'麻辣鲜香的嫩豆腐，川味十足','/api/uploads/seed-mapo.svg',1,'2026-11-18 19:05:25','2026-11-18 19:05:25');
INSERT INTO `menu_items` (`id`, `name`, `category`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES (3,'鱼香肉丝','热菜',32.00,'咸甜酸辣兼备，经典下饭菜','/api/uploads/seed-yuxiang.svg',1,'2026-11-18 19:05:25','2026-11-18 19:05:25');
INSERT INTO `menu_items` (`id`, `name`, `category`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES (4,'清炒时蔬','素菜',18.00,'当季新鲜蔬菜，清爽解腻','/api/uploads/seed-shucai.svg',1,'2026-11-18 19:05:25','2026-11-18 19:05:25');
INSERT INTO `menu_items` (`id`, `name`, `category`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES (5,'凉拌黄瓜','凉菜',16.00,'清脆爽口，蒜香开胃','/api/uploads/seed-huanggua.svg',1,'2026-11-18 19:05:25','2026-11-18 19:05:25');
INSERT INTO `menu_items` (`id`, `name`, `category`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES (6,'番茄蛋汤','汤品',12.00,'酸甜开胃的家常靓汤','/api/uploads/seed-tang.svg',1,'2026-11-18 19:05:25','2026-11-18 19:05:25');
INSERT INTO `menu_items` (`id`, `name`, `category`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES (7,'米饭','主食',2.00,'东北大米，粒粒分明','/api/uploads/seed-mifan.svg',1,'2026-11-18 19:05:25','2026-11-18 19:05:25');
INSERT INTO `menu_items` (`id`, `name`, `category`, `price`, `description`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES (8,'酸梅汤','饮品',8.00,'冰镇酸梅汤，解腻消暑','/api/uploads/seed-suanmei.svg',1,'2026-11-18 19:05:25','2026-11-18 19:05:25');
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;

/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (1,1,1,2,1);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (2,1,2,1,0);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (3,2,1,1,1);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (4,2,8,1,1);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (5,3,2,1,1);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (6,3,7,2,1);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (7,4,3,1,1);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (8,4,6,1,1);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (9,5,4,1,1);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (10,5,7,2,1);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (11,6,5,2,1);
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `is_done`) VALUES (12,6,8,2,1);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;

/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` (`id`, `table_id`, `customer_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES (1,1,4,'pending','2026-11-18 18:53:25','2026-11-18 18:53:25',NULL,1);
INSERT INTO `orders` (`id`, `table_id`, `customer_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES (2,2,4,'paid','2026-11-18 15:05:25','2026-11-18 15:35:25','2026-11-18 15:35:25',NULL);
INSERT INTO `orders` (`id`, `table_id`, `customer_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES (3,2,4,'served','2026-11-18 18:40:25','2026-11-18 18:40:25',NULL,2);
INSERT INTO `orders` (`id`, `table_id`, `customer_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES (4,3,4,'paid','2026-11-18 17:55:25','2026-11-18 18:10:25','2026-11-18 18:10:25',NULL);
INSERT INTO `orders` (`id`, `table_id`, `customer_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES (5,4,4,'paid','2026-11-17 17:05:25','2026-11-17 18:05:25','2026-11-17 18:05:25',NULL);
INSERT INTO `orders` (`id`, `table_id`, `customer_id`, `status`, `created_at`, `updated_at`, `paid_at`, `pending_table_id`) VALUES (6,5,4,'paid','2026-11-15 19:05:25','2026-11-15 19:20:25','2026-11-15 19:20:25',NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;

/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` (`id`, `order_id`, `user_id`, `menu_item_id`, `rating`, `content`, `created_at`) VALUES (1,4,4,3,5,'鱼香肉丝很下饭，汤也很热乎，出餐速度不错。','2026-11-18 18:25:25');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;

/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`id`, `username`, `nickname`, `password_hash`, `phone`, `role`, `created_at`) VALUES (1,'admin','店长0001','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','','manager','2026-11-18 19:05:25');
INSERT INTO `users` (`id`, `username`, `nickname`, `password_hash`, `phone`, `role`, `created_at`) VALUES (2,'chef01','厨师0001','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','','chef','2026-11-18 19:05:25');
INSERT INTO `users` (`id`, `username`, `nickname`, `password_hash`, `phone`, `role`, `created_at`) VALUES (3,'cashier01','收银员0001','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','','cashier','2026-11-18 19:05:25');
INSERT INTO `users` (`id`, `username`, `nickname`, `password_hash`, `phone`, `role`, `created_at`) VALUES (4,'customer01','顾客0001','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','13800000000','customer','2026-11-18 19:05:25');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;


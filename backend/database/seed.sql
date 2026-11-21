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

# 餐厅点餐系统 / Restaurant Ordering System

> 2026 秋季《Web数据库技术》课程大作业 · 最终成品
>
> 前后端分离 · 扫码点餐 · 四角色协同 · 33 个 REST 接口 · 7 张业务表 · 35 条接口测试

餐厅点餐系统面向小型餐厅堂食场景，打通“店长配置 → 顾客扫码点餐 → 后厨制作 → 收银结账 → 数据统计”的完整业务闭环。顾客扫码即可点餐；注册顾客可以查看历史订单、收藏菜品和发表评价；店长、厨师、收银员分别使用独立工作台。

![顾客点餐页](docs/assets/order.png)
![店长数据概览](docs/assets/admin-dashboard.png)

## 1. 功能概览

| 角色 | 入口 | 核心功能 |
| --- | --- | --- |
| 店长 | `/admin` | 经营概览、订单检索与详情、账户管理、餐桌管理、菜单管理、图片上传 |
| 厨师 | `/kitchen` | 所有桌台卡片、已做/未做数量、明细抽屉、逐菜标记做好/撤销 |
| 收银员 | `/cashier` | 待结账桌台、金额汇总、订单明细、结账 |
| 顾客 | `/order/{二维码编码}`、`/customer` | 扫码点餐、数量增减、提交/覆盖、收藏、查看评价、个人中心 |

- **认证**：员工与顾客登录、顾客自助注册、退出、修改密码、个人资料编辑。
- **订单**：同一桌最多一个未结账订单；后提交覆盖前一次内容，数量未变的菜品保留已做状态。
- **状态机**：`pending`（制作中）→ `served`（已上齐/待结账）→ `paid`（已结账）。
- **互动**：收藏菜品、按“订单 + 菜品”发表评分与文字评价。
- **统计**：今日营业额/订单、近 7 天趋势、热销菜品、最新评价、状态统计（ECharts）。
- **多端**：顾客页每 5 秒轮询同步；后厨/收银每 5 秒刷新。
- **安全**：JWT、后端角色守卫、PDO 预处理、SHA-256 密码哈希、上传白名单、统一错误码。

## 2. 技术栈

- 前端：Vite 6 + React 18 + TypeScript 5.7 + Ant Design 5 + React Router 6 + Axios + ECharts 6
- 后端：PHP 8.5（原生，无框架依赖；自行实现路由、JWT、PDO 数据访问）
- 数据库：MySQL 8.0+（utf8mb4 / InnoDB）
- 认证：JWT HS256；密码 SHA-256 哈希
- 部署：PHP 内置 HTTP 服务器 + `start.bat` / `start.sh`，无需 Apache / Nginx
- 测试：Node.js `fetch` 接口测试（35 条）+ Playwright 页面验收

## 3. 目录结构

```text
restaurant-ordering/
├── backend/
│   ├── api.php                    # API 入口与 33 条路由
│   ├── router.php                 # PHP 内置服务器路由（/api + SPA 回退）
│   ├── bin/migrate.php            # 初始化/重置数据库
│   ├── database/
│   │   ├── schema.sql             # 建表脚本（7 张表）
│   │   ├── seed.sql               # 种子数据
│   │   └── init.sql               # 建库 + 建表 + 种子数据
│   ├── src/
│   │   ├── Controllers/           # Auth/User/Table/Menu/Order/Customer/Admin
│   │   ├── Auth.php               # JWT 与用户上下文
│   │   ├── Database.php
│   │   └── Support/Installer.php  # 自动建库、种子数据、演示图片
│   ├── storage/uploads/           # 上传图片
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/                 # 登录/注册/店长/后厨/收银/顾客/个人中心
│   │   ├── api/client.ts
│   │   ├── auth/AuthContext.tsx
│   │   └── components/AppHeader.tsx
│   └── dist/                      # 前端构建输出（需构建）
├── tests/api-test.mjs             # 35 条接口测试
├── docs/                          # 开发文档、用户手册、过程材料、PPT
├── start.bat / start.sh
├── README.md
└── .gitignore
```

## 4. 快速开始

### 4.1 环境要求

- PHP 8.2+（启用 `pdo_mysql`、`mbstring`、`fileinfo`）
- Node.js 20+ 与 pnpm
- MySQL 8.0+（可远程或本地）

### 4.2 配置数据库

复制模板并按实际环境修改：

```bash
cp backend/.env.example backend/.env
# Windows: copy backend\.env.example backend\.env
```

```dotenv
JWT_SECRET=please-change-this-secret
JWT_TTL=315360000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=restaurant_ordering
DB_USERNAME=root
DB_PASSWORD=root
```

`backend/.env` 已加入 `.gitignore`，不要提交真实密码。若使用远程数据库，填写远程地址并放行 3306 端口。

### 4.3 初始化数据库

首次启动会自动建库、建表和写入种子数据；也可手动执行：

```bash
# 可重复执行，不会清空已有数据
php backend/bin/migrate.php

# 重置数据库（会删除并重建，慎用）
php backend/bin/migrate.php --fresh

# 或使用纯 SQL（建库 + 建表 + 种子数据；Windows 建议指定 utf8mb4）
mysql --default-character-set=utf8mb4 -u root -p < backend/database/init.sql
```

种子数据包含：6 张餐桌、8 道菜、6 笔订单（制作中/待结账/已结账）、1 条评价、2 条收藏。

### 4.4 构建前端

```bash
cd frontend
pnpm install
pnpm build
```

`frontend/dist/` 是构建产物，已被 `.gitignore` 忽略；从仓库克隆后必须先构建，启动脚本才能找到静态文件。

### 4.5 启动

Windows：

```bat
start.bat
```

Linux：

```bash
chmod +x start.sh
./start.sh
```

浏览器访问 <http://localhost:8000>。

> `0.0.0.0:8000` 是监听地址，不是访问地址。本机用 `localhost`；手机用电脑局域网 IP（如 `http://192.168.1.10:8000`），并放行防火墙 8000 端口。

### 4.6 演示账号

| 角色 | 用户名 | 密码 | 入口 |
| --- | --- | --- | --- |
| 店长 | `admin` | `123456` | `http://localhost:8000/admin` |
| 厨师 | `chef01` | `123456` | `http://localhost:8000/kitchen` |
| 收银员 | `cashier01` | `123456` | `http://localhost:8000/cashier` |
| 顾客 | `customer01` | `123456` | `http://localhost:8000/customer` |

顾客也可以扫码免登录点餐；登录顾客可查看订单、收藏和评价。员工账号由店长在“账户管理”中创建。

## 5. 数据库设计

共 7 张业务表：

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `users` | 员工与顾客账户 | `username` 唯一；角色枚举 `manager/chef/cashier/customer` |
| `dining_tables` | 餐桌与二维码固定编码 | `public_code` 唯一；`name` 唯一 |
| `menu_items` | 菜品、分类、图片 | `is_active` 软删除；分类、价格校验 |
| `orders` | 订单主表 | `pending_table_id` 唯一，保证每桌最多一个未结账订单 |
| `order_items` | 订单明细 | `(order_id, menu_item_id)` 唯一；`is_done` |
| `favorites` | 收藏 | `(user_id, menu_item_id)` 唯一 |
| `reviews` | 评价 | `(order_id, menu_item_id)` 唯一；评分 1–5 |

金额不冗余存储，由 `order_items.quantity × menu_items.price` 实时汇总；订单、明细、收藏、评价通过外键保证引用完整性。完整 ER 图、字段、索引与外键见开发文档第 4 章。

## 6. API 一览

Base URL：开发环境 `http://localhost:8000/api`，生产环境 `/api`。除公开接口外，请求头需带 `Authorization: Bearer <token>`。

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/auth/login` | 公开 | 登录，返回 JWT |
| POST | `/auth/register` | 公开 | 顾客注册并自动登录 |
| GET | `/auth/me` | 登录用户 | 当前用户信息 |
| PATCH | `/profile` | 登录用户 | 修改昵称/手机号 |
| POST | `/auth/password` | 登录用户 | 修改密码 |
| GET | `/users` | 店长 | 账户列表（角色/关键词筛选） |
| POST | `/users` | 店长 | 创建厨师/收银员 |
| DELETE | `/users/{id}` | 店长 | 删除账户 |
| GET | `/tables` | 店长 | 餐桌列表 |
| POST | `/tables` | 店长 | 新增餐桌（自动命名） |
| PATCH | `/tables/{id}` | 店长 | 修改餐桌名称 |
| DELETE | `/tables/{id}` | 店长 | 删除餐桌 |
| GET | `/tables/overview` | 厨师/收银员 | 餐桌与最近订单 |
| GET | `/menu` | 公开 | 在售菜单（分类/关键词筛选） |
| GET | `/menu/categories` | 公开 | 分类列表 |
| GET | `/menu/{id}/reviews` | 公开 | 菜品评价 |
| POST | `/menu` | 店长 | 新增菜品 |
| PUT | `/menu/{id}` | 店长 | 修改菜品 |
| DELETE | `/menu/{id}` | 店长 | 删除菜品（软删除） |
| POST | `/uploads` | 店长 | 上传图片 |
| GET | `/uploads/{filename}` | 公开 | 读取图片 |
| GET | `/orders/table/{code}` | 公开 | 扫码读取当前订单 |
| PUT | `/orders/table/{code}` | 公开（顾客令牌可选） | 提交/覆盖订单 |
| PATCH | `/order-items/{id}` | 厨师 | 标记菜品做好 |
| POST | `/orders/{id}/pay` | 收银员 | 结账 |
| GET | `/my/orders` | 顾客 | 我的订单 |
| GET | `/my/favorites` | 顾客 | 我的收藏 |
| POST | `/my/favorites/{id}` | 顾客 | 收藏/取消收藏 |
| GET | `/my/reviews` | 顾客 | 我的评价 |
| POST | `/my/orders/{id}/reviews` | 顾客 | 发表评价 |
| GET | `/admin/orders` | 店长 | 订单搜索/筛选/分页 |
| GET | `/admin/orders/{id}` | 店长 | 订单详情 |
| GET | `/admin/stats` | 店长 | 经营统计 |

完整请求/响应示例与错误码见 [开发文档](docs/开发文档-餐厅点餐系统.docx) 第 5 章。

## 7. 测试

测试前建议重置为干净种子数据：

```bash
php backend/bin/migrate.php --fresh
node tests/api-test.mjs
```

本次执行结果：**35 条用例全部通过，0 失败**。覆盖：

- 正常：登录、注册、资料修改、餐桌/菜品创建、上传、点餐、覆盖、标记、结账、评价、收藏、统计
- 异常：错误密码、重复用户名、非法用户名、空订单、非法分类、重复结账、重复评价、无效二维码
- 权限：未登录、顾客越权、厨师越权结账
- 安全：SQL 注入登录、非图片上传

测试明细与用例表见 [开发文档](docs/开发文档-餐厅点餐系统.docx) 第 6 章。

## 8. 安全说明

- 密码 SHA-256 哈希存储，不保存明文；JWT HS256 签名并校验有效期。
- 所有数据库访问使用 PDO 预处理，避免 SQL 注入。
- 后端按路由声明角色，前端路由守卫只做体验层拦截；越权请求返回 403。
- 上传仅允许 JPG/PNG/GIF/WEBP，校验 `getimagesize` 与 5MB 大小限制，随机文件名。
- React 默认转义输出，未使用 `dangerouslySetInnerHTML`；服务端对长度、枚举、评分等做校验。

## 9. 文档与交付物

| 交付物 | 路径 |
| --- | --- |
| 开发文档（需求/设计/ER/API/测试/部署） | [docs/开发文档-餐厅点餐系统.docx](docs/开发文档-餐厅点餐系统.docx) |
| 用户使用手册 | [docs/用户使用手册-餐厅点餐系统.docx](docs/用户使用手册-餐厅点餐系统.docx) |
| 项目选题提案表 | [docs/01-项目选题提案表.docx](docs/01-项目选题提案表.docx) |
| 分工与 Git 贡献表 | [docs/02-分工与Git贡献表.docx](docs/02-分工与Git贡献表.docx) |
| 组内互评表 | [docs/03-组内互评表.docx](docs/03-组内互评表.docx) |
| 挑战功能说明表 | [docs/04-挑战功能说明表.docx](docs/04-挑战功能说明表.docx) |
| 最终汇报 PPT（HTML 放映 / PPTX） | [docs/ppt/餐厅点餐系统-最终汇报.html](docs/ppt/餐厅点餐系统-最终汇报.html) · [.pptx](docs/ppt/餐厅点餐系统-最终汇报.pptx) |
| 原始项目开发文档 | [docs/项目开发文档.md](docs/项目开发文档.md) |

## 10. 常见问题

- **8000 端口被占用**：关闭占用程序，或同时修改启动脚本和前端 API 地址后重新构建。
- **PHP 报 `could not find driver`**：在 `php.ini` 中启用 `pdo_mysql` 并设置正确的 `extension_dir`。
- **页面没有数据 / 数据库被删**：执行 `php backend/bin/migrate.php --fresh` 重建。
- **手机扫码打不开**：用电脑局域网 IP 访问系统后再展示二维码，确认同一网络且防火墙放行 8000。
- **上传图片失败**：仅支持 JPG/PNG/GIF/WEBP，且不超过 5MB。

## 11. 小组

| 姓名 | 角色 | 主要工作 |
| --- | --- | --- |
| 马见川 | 组长 / 后端与架构 | 需求、数据库、接口、JWT、订单状态、联调、文档 |
| 董睿 | 前端基础 / 店长端 | 前端工程、登录注册、店长后台、账户/餐桌/菜单 |
| 应一帆 | 顾客端 / 交互 | 点餐、购物车、收藏、评价、二维码、多端同步 |
| 陈嘉尚 | 后厨 / 收银 / 测试 | 看板、收银、测试、种子数据、部署材料 |

2026 年 11 月

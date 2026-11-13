# Restaurant Ordering / 餐厅点餐系统

用于餐厅在线点餐的功能演示项目。前后端分离，前端为 React SPA，后端为原生 PHP 8 的 RESTful API，数据库为 MySQL。

## 技术栈

- 前端：Vite + pnpm + React 18 + TypeScript + Ant Design 5 + React Router 6 + Axios
- 后端：PHP 8.5（无第三方依赖，自行实现路由、JWT、PDO 数据访问）
- 数据库：MySQL（utf8mb4）
- 认证：JWT（HS256，有效期约 10 年，实现“永久登录”）
- 密码：数据库中存储 SHA-256 哈希值

## 目录结构

```text
restaurant-ordering/
├── frontend/              # 前端项目
│   ├── src/
│   └── dist/              # 前端构建输出（已构建）
├── backend/               # 后端项目
│   ├── .env               # 数据库与 JWT 配置（明文）
│   ├── api.php            # API 入口与路由表
│   ├── router.php         # PHP 内置服务器路由（静态文件 + SPA 回退）
│   ├── src/               # 应用代码
│   ├── database/schema.sql
│   ├── storage/           # 上传图片、安装标记
│   └── bin/migrate.php    # 手动初始化数据库
├── start.bat              # Windows 启动脚本
├── start.sh               # Linux 启动脚本
└── docs/项目开发文档.md
```

## 快速开始

### 1. 环境准备

- PHP 8.2+，已启用 `pdo_mysql` 扩展
- Node.js 20+ 与 pnpm
- 可访问的 MySQL 数据库

当前环境已按以下配置准备好：

- PHP：`C:\php\php85`。官方 Windows ZIP 只带 `php.ini-development` / `php.ini-production` 模板，而 PHP 只会自动加载名为 `php.ini` 的文件；`pdo_mysql` 是共享扩展，必须在 `php.ini` 中启用。当前已创建 `C:\php\php85\php.ini` 并启用 `pdo_mysql`（以及用于中文长度校验的 `mbstring` 等扩展）。
- Node.js：v26.13.1（nvm），pnpm 12
- MySQL：`172.23.57.15:3306`，账号 `root` / `root`

### 2. 配置数据库连接

数据库连接信息在 `backend/.env` 中（已加入 `.gitignore`，仓库中只保留可提交的 `backend/.env.example`）。若该文件不存在，先复制模板：

```bash
cp backend/.env.example backend/.env
# Windows: copy backend\.env.example backend\.env
```

然后按实际环境修改：

```dotenv
DB_HOST=172.23.57.15
DB_PORT=3306
DB_DATABASE=restaurant_ordering
DB_USERNAME=root
DB_PASSWORD=root
```

首次启动时会自动创建数据库、数据表，并写入演示数据（店长账户、3 张餐桌、6 道菜品）。
也可以手动执行初始化（可重复执行，不会清空已有数据）：

```bash
php backend/bin/migrate.php
```

### 3. 构建前端

```bash
cd frontend
pnpm install
pnpm build
```

> `frontend/dist/` 是构建产物，已加入 `.gitignore`。从 GitHub 克隆项目后需要先执行上述构建命令，`start.bat` / `start.sh` 才能找到前端文件。

### 4. 启动服务

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

> 启动脚本将 PHP 工作目录设为 `backend/`、Web 根目录设为 `frontend/dist`，在 `0.0.0.0:8000` 上运行。
> `0.0.0.0` 是**监听地址**（监听所有网卡），不是浏览器访问地址；本机访问 `http://localhost:8000`，
> 手机或其他局域网设备访问 `http://<电脑局域网IP>:8000`。
> 后端不使用 Apache / Nginx，直接由 PHP 内置 HTTP 服务器配合 `backend/router.php` 提供服务：
> `/api/*` 交给 PHP 处理，其余请求返回 `frontend/dist` 中的静态文件，未命中时回退到 `index.html` 以支持 SPA 路由。

## 初始账户

| 角色 | 用户名 | 密码 | 说明 |
| --- | --- | --- | --- |
| 店长 | `admin` | `123456` | 首次启动自动创建，可创建厨师/收银员账户 |

厨师、收银员账户由店长在“账户管理”中创建。创建时昵称自动填充为“角色名 + 随机 4 位编号”，密码自动填充为 `123456`，均可修改。

## 功能说明

### 店长（`/admin`）

- **账户管理**：查看、创建、删除厨师与收银员账户
- **餐桌管理**：添加/删除餐桌；新增时自动命名为“当前餐桌数量 + 1”数字 + “桌”，重名时继续自增；可修改餐桌名称（不可重名）；可查看每张餐桌的点餐二维码
- **菜单管理**：添加、编辑、删除菜品，支持图片上传（JPG/PNG/GIF/WEBP，≤5MB）或填写图片 URL

二维码内容为 `http://<访问地址>/order/<餐桌固定编码>`。编码在创建餐桌时生成，修改餐桌名称不会改变编码，因此已打印的二维码不会失效。

> 若要让手机扫码访问，请使用电脑的局域网 IP 打开本系统（例如 `http://192.168.1.10:8000`）后再展示/打印二维码；
> 使用 `localhost` 生成的二维码只能在电脑本机打开。

### 厨师（`/kitchen`）

- 多列卡片展示所有餐桌，卡片显示餐桌名、点餐状态、已做/未做菜品数量
- 未做菜品大于 0 时卡片为橙色；全部做好为绿色；已结账为灰色
- 点击卡片查看点餐明细，可标记单个菜品“做好”或撤销

### 收银员（`/cashier`）

- 多列卡片展示所有餐桌的点餐状态与金额
- 点击卡片查看点餐明细，可对未结账订单执行“结账”
- 结账后订单状态变为已结账，所有菜品视为已做好，已做/未做数量均显示为 0

### 客户（扫描餐桌二维码）

- 无需登录，扫码进入该桌点餐页
- 菜单卡片展示名称、价格、描述、图片，可增减每样菜的数量（0–99）
- 点击“提交订单”即可下单；提交后仍可继续修改，再次提交会覆盖该桌当前未结账订单
- 多台设备同时点餐时，页面每 5 秒同步一次；有人提交新内容时会提示，继续提交将覆盖先前内容

## 开发模式

后端（`backend/` 目录下）：

```bash
cd backend
php -S 0.0.0.0:8000 -t ../frontend/dist router.php
```

前端（`frontend/` 目录下）：

```bash
pnpm dev
```

开发环境前端访问 `http://localhost:5173`，API 根路径为 `http://localhost:8000/api`；
生产环境 API 根路径为 `/api`。开发模式与生产模式已按此区分（见 `frontend/src/api/client.ts`）。

## API 一览

所有接口以 `/api` 为前缀，除公开接口外均需请求头 `Authorization: Bearer <token>`。

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/auth/login` | 公开 | 登录，返回 JWT |
| GET | `/auth/me` | 登录用户 | 当前用户信息 |
| POST | `/auth/password` | 登录用户 | 修改密码 |
| GET | `/users` | 店长 | 账户列表 |
| POST | `/users` | 店长 | 创建厨师/收银员 |
| DELETE | `/users/{id}` | 店长 | 删除账户 |
| GET | `/tables` | 店长 | 餐桌列表 |
| POST | `/tables` | 店长 | 新增餐桌（自动命名） |
| PATCH | `/tables/{id}` | 店长 | 修改餐桌名称 |
| DELETE | `/tables/{id}` | 店长 | 删除餐桌 |
| GET | `/menu` | 公开 | 在售菜单 |
| POST | `/menu` | 店长 | 新增菜品 |
| PUT | `/menu/{id}` | 店长 | 修改菜品 |
| DELETE | `/menu/{id}` | 店长 | 删除菜品（软删除） |
| POST | `/uploads` | 店长 | 上传菜品图片 |
| GET | `/uploads/{filename}` | 公开 | 读取图片 |
| GET | `/tables/overview` | 厨师/收银员 | 所有餐桌及最近订单 |
| GET | `/orders/table/{code}` | 公开 | 扫码获取餐桌与当前未结账订单 |
| PUT | `/orders/table/{code}` | 公开 | 提交/覆盖订单 |
| PATCH | `/order-items/{id}` | 厨师 | 标记菜品是否做好 |
| POST | `/orders/{id}/pay` | 收银员 | 结账 |

## 数据库设计

- `users`：员工账户，`password_hash` 存 SHA-256，角色为 `manager` / `chef` / `cashier`
- `dining_tables`：餐桌，`public_code` 为二维码固定编码，`name` 唯一
- `menu_items`：菜品，`is_active` 用于软删除以保留历史订单引用
- `orders`：订单，状态 `pending` / `paid`；`pending_table_id` 配合唯一索引保证每桌同时最多一个未结账订单
- `order_items`：订单明细，`(order_id, menu_item_id)` 唯一，`is_done` 表示是否做好

金额不冗余存储，由 `order_items.quantity × menu_items.price` 实时汇总；订单明细仅引用菜品 ID，符合第三范式。

## 说明

- 本项目仅用于功能演示与开发测试，未实现生产级的日志、监控、容灾、自动化测试与 CI/CD。
- 修改密码时要求输入两遍新密码，不限制密码复杂度。
- 顾客提交新订单会覆盖该桌当前未结账订单；数量未变化的菜品会保留原有的“已做好”状态，数量变化的菜品重置为未做。

## 常见问题

- **端口 8000 被占用**：关闭占用端口的程序，或同时修改 `start.bat` / `start.sh` 中的端口与前端 `frontend/src/api/client.ts` 中的 API 地址后重新构建。
- **数据库被手动删除或重置**：删除 `backend/storage/installed.lock`，然后执行 `php backend/bin/migrate.php`，再次启动即可重新建表并写入演示数据。
- **页面显示“无法连接服务器”**：确认后端已启动；开发模式下前端默认访问 `http://localhost:8000/api`。
- **手机扫码打不开**：确认手机与电脑在同一局域网、系统使用电脑的局域网 IP 访问，并允许 Windows 防火墙放行 8000 端口。

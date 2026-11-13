<?php

declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\MenuController;
use App\Controllers\OrderController;
use App\Controllers\TableController;
use App\Controllers\UploadController;
use App\Controllers\UserController;
use App\Http\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Http\Router;
use App\Support\Installer;

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Max-Age: 86400');

if (Request::method() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$router = new Router();

// 认证
$router->add('POST', '/api/auth/login', [AuthController::class, 'login']);
$router->add('GET', '/api/auth/me', [AuthController::class, 'me'], ['manager', 'chef', 'cashier']);
$router->add('POST', '/api/auth/password', [AuthController::class, 'changePassword'], ['manager', 'chef', 'cashier']);

// 账户管理（店长）
$router->add('GET', '/api/users', [UserController::class, 'index'], ['manager']);
$router->add('POST', '/api/users', [UserController::class, 'store'], ['manager']);
$router->add('DELETE', '/api/users/{id}', [UserController::class, 'destroy'], ['manager']);

// 餐桌管理（店长）
$router->add('GET', '/api/tables/overview', [OrderController::class, 'overview'], ['chef', 'cashier']);
$router->add('GET', '/api/tables', [TableController::class, 'index'], ['manager']);
$router->add('POST', '/api/tables', [TableController::class, 'store'], ['manager']);
$router->add('PATCH', '/api/tables/{id}', [TableController::class, 'update'], ['manager']);
$router->add('DELETE', '/api/tables/{id}', [TableController::class, 'destroy'], ['manager']);

// 菜单
$router->add('GET', '/api/menu', [MenuController::class, 'index']);
$router->add('POST', '/api/menu', [MenuController::class, 'store'], ['manager']);
$router->add('PUT', '/api/menu/{id}', [MenuController::class, 'update'], ['manager']);
$router->add('DELETE', '/api/menu/{id}', [MenuController::class, 'destroy'], ['manager']);

// 图片
$router->add('POST', '/api/uploads', [UploadController::class, 'store'], ['manager']);
$router->add('GET', '/api/uploads/{filename}', [UploadController::class, 'show']);

// 点餐与订单
$router->add('GET', '/api/orders/table/{code}', [OrderController::class, 'tableOrder']);
$router->add('PUT', '/api/orders/table/{code}', [OrderController::class, 'submit']);
$router->add('PATCH', '/api/order-items/{id}', [OrderController::class, 'toggleItem'], ['chef']);
$router->add('POST', '/api/orders/{id}/pay', [OrderController::class, 'pay'], ['cashier']);

try {
    Installer::ensureInstalled();
    $router->dispatch();
} catch (HttpException $exception) {
    Response::error($exception->getMessage(), $exception->status());
} catch (PDOException $exception) {
    error_log((string) $exception);

    if ($exception->getCode() === '23000') {
        Response::error('数据冲突，请刷新后重试', 409);
    }

    Response::error('数据库操作失败：' . $exception->getMessage(), 500);
} catch (Throwable $exception) {
    error_log((string) $exception);
    Response::error('服务器内部错误：' . $exception->getMessage(), 500);
}

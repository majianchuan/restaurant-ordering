<?php

declare(strict_types=1);

/**
 * PHP 内置服务器的路由入口。
 *
 * - /api 开头的请求交给 api.php 处理；
 * - 其余请求优先返回 frontend/dist 中的静态文件；
 * - 找不到静态文件时回退到 index.html，从而支持 SPA 前端路由。
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (!is_string($uri) || $uri === '') {
    $uri = '/';
}

if ($uri === '/api' || str_starts_with($uri, '/api/')) {
    require __DIR__ . DIRECTORY_SEPARATOR . 'api.php';
    return true;
}

$docroot = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''));
if ($docroot !== false) {
    $candidate = realpath($docroot . DIRECTORY_SEPARATOR . ltrim($uri, '/\\'));
    $insideDocroot = $candidate !== false
        && str_starts_with($candidate, $docroot . DIRECTORY_SEPARATOR);

    if ($uri !== '/' && $insideDocroot && is_file($candidate)) {
        return false;
    }

    $index = $docroot . DIRECTORY_SEPARATOR . 'index.html';
    if (is_file($index)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($index);
        return true;
    }
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo '前端尚未构建，请先在 frontend 目录执行 pnpm install && pnpm build';
return true;

<?php

declare(strict_types=1);

namespace App\Http;

use App\Auth;

/**
 * 简单路由表，支持 /api/users/{id} 形式的路径参数。
 */
final class Router
{
    /**
     * @var array<int, array{method: string, regex: string, names: array<int, string>, handler: callable, roles: array<int, string>}>
     */
    private array $routes = [];

    /**
     * @param array<int, string> $roles 允许访问的角色，留空表示无需登录
     */
    public function add(string $method, string $pattern, callable $handler, array $roles = []): void
    {
        $names = [];
        $regex = preg_replace_callback(
            '/\{([A-Za-z_][A-Za-z0-9_]*)\}/',
            static function (array $matches) use (&$names): string {
                $names[] = $matches[1];

                return '([^/]+)';
            },
            $pattern
        );

        $this->routes[] = [
            'method' => strtoupper($method),
            'regex' => '#^' . $regex . '$#',
            'names' => $names,
            'handler' => $handler,
            'roles' => $roles,
        ];
    }

    public function dispatch(): void
    {
        $method = Request::method();
        $path = Request::path();
        $pathMatched = false;

        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $path, $matches)) {
                continue;
            }

            $pathMatched = true;

            if ($route['method'] !== $method) {
                continue;
            }

            $params = [];
            foreach ($route['names'] as $index => $name) {
                $params[$name] = urldecode($matches[$index + 1]);
            }

            if ($route['roles'] !== []) {
                Auth::requireRole(...$route['roles']);
            }

            $result = ($route['handler'])($params);
            Response::json($result);
        }

        if ($pathMatched) {
            throw new HttpException(405, '不支持的请求方法');
        }

        throw new HttpException(404, '接口不存在');
    }
}

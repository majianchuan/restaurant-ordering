<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;

final class UploadController
{
    private const MAX_SIZE = 5 * 1024 * 1024;

    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    /**
     * @return array<string, mixed>
     */
    public static function store(): array
    {
        $file = $_FILES['file'] ?? null;

        if (!is_array($file) || !isset($file['error']) || $file['error'] === UPLOAD_ERR_NO_FILE) {
            throw new HttpException(422, '请选择要上传的图片');
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new HttpException(422, '图片上传失败，请重试');
        }

        if ((int) $file['size'] > self::MAX_SIZE) {
            throw new HttpException(422, '图片大小不能超过 5MB');
        }

        $extension = strtolower(pathinfo((string) $file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new HttpException(422, '仅支持 JPG、PNG、GIF、WEBP 格式的图片');
        }

        if (@getimagesize((string) $file['tmp_name']) === false) {
            throw new HttpException(422, '上传的文件不是有效的图片');
        }

        if (!is_dir(UPLOAD_PATH) && !mkdir(UPLOAD_PATH, 0777, true) && !is_dir(UPLOAD_PATH)) {
            throw new HttpException(500, '图片存储目录不可用');
        }

        $filename = bin2hex(random_bytes(16)) . '.' . $extension;
        if (!move_uploaded_file((string) $file['tmp_name'], UPLOAD_PATH . DIRECTORY_SEPARATOR . $filename)) {
            throw new HttpException(500, '图片保存失败');
        }

        return ['url' => '/api/uploads/' . $filename];
    }

    /**
     * 输出已上传的图片（含演示数据的 SVG 占位图）。
     *
     * @param array<string, string> $params
     */
    public static function show(array $params): never
    {
        $filename = $params['filename'] ?? '';

        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $filename) || str_contains($filename, '..')) {
            http_response_code(404);
            exit;
        }

        $path = UPLOAD_PATH . DIRECTORY_SEPARATOR . $filename;
        if (!is_file($path)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo '图片不存在';
            exit;
        }

        $types = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
        ];
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        header('Content-Type: ' . ($types[$extension] ?? 'application/octet-stream'));
        header('Content-Length: ' . (string) filesize($path));
        header('Cache-Control: public, max-age=86400');
        header('X-Content-Type-Options: nosniff');

        readfile($path);
        exit;
    }
}

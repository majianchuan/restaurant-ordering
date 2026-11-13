<?php

declare(strict_types=1);

use App\Support\Installer;

require __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'bootstrap.php';

try {
    Installer::install();
    fwrite(STDOUT, "数据库初始化完成（数据库：" . App\Config::require('DB_DATABASE') . "）\n");
} catch (Throwable $exception) {
    fwrite(STDERR, '数据库初始化失败：' . $exception->getMessage() . "\n");
    exit(1);
}

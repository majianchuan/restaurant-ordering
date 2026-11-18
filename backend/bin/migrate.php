<?php

declare(strict_types=1);

use App\Config;
use App\Database;
use App\Support\Installer;

require __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'bootstrap.php';

try {
    $fresh = in_array('--fresh', $argv ?? [], true);

    if ($fresh) {
        $database = Config::require('DB_DATABASE');
        if (!preg_match('/^[A-Za-z0-9_]+$/', $database)) {
            throw new RuntimeException('DB_DATABASE 只能包含字母、数字和下划线');
        }
        Database::server()->exec(sprintf('DROP DATABASE IF EXISTS `%s`', $database));
        @unlink(Installer::lockFile());
        fwrite(STDOUT, "已删除数据库 {$database}，开始重新初始化...\n");
    }

    Installer::install();
    fwrite(
        STDOUT,
        '数据库初始化完成（数据库：' . Config::require('DB_DATABASE') . "）\n"
    );
    fwrite(STDOUT, "演示账号：admin / chef01 / cashier01 / customer01，密码均为 123456\n");
} catch (Throwable $exception) {
    fwrite(STDERR, '数据库初始化失败：' . $exception->getMessage() . "\n");
    exit(1);
}

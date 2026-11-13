<?php

declare(strict_types=1);

namespace App\Http;

/**
 * 带 HTTP 状态码的业务异常。
 */
final class HttpException extends \RuntimeException
{
    public function __construct(private readonly int $status, string $message)
    {
        parent::__construct($message);
    }

    public function status(): int
    {
        return $this->status;
    }
}

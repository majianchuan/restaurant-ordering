<?php

declare(strict_types=1);

namespace App\Support;

final class Str
{
    public static function length(string $value): int
    {
        return function_exists('mb_strlen') ? (int) mb_strlen($value) : strlen($value);
    }
}

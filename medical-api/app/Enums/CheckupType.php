<?php

namespace App\Enums;

enum CheckupType: string
{
    case Normal = 'normal';
    case Emergency = 'emergency';
}

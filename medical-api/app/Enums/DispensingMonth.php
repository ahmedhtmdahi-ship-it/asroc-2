<?php

namespace App\Enums;

enum DispensingMonth: string
{
    case Pending = 'pending';
    case Dispensed = 'dispensed';
}

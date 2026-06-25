<?php

namespace App\Enums;

enum MonthlyTreatmentStatus: string
{
    case Active = 'active';
    case Paused = 'paused';
    case Modified = 'modified';
    case Discontinued = 'discontinued';
}

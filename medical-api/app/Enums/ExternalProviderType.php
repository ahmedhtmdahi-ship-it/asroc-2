<?php

namespace App\Enums;

enum ExternalProviderType: string
{
    case Clinic = 'clinic';
    case Doctor = 'doctor';
    case RadiologyCenter = 'radiology_center';
    case Hospital = 'hospital';
    case Lab = 'lab';
}

<?php

namespace App\Models;

use App\Enums\ExternalProviderType;
use Illuminate\Database\Eloquent\Model;

class ExternalProvider extends Model
{
    protected $fillable = [
        'name',
        'type',
        'specialty',
        'address',
        'latitude',
        'longitude',
        'phone',
        'notes',
    ];

    protected $casts = [
        'type' => ExternalProviderType::class,
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];
}

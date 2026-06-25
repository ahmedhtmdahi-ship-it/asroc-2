<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Medicine extends Model
{
    protected $fillable = [
        'name',
        'active_ingredient',
        'category',
        'current_stock',
        'minimum_stock',
        'unit',
    ];

    public function isLowStock(): bool
    {
        return $this->current_stock <= $this->minimum_stock;
    }
}

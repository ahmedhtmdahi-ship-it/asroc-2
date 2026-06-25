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
        'average_cost',
    ];

    protected $casts = [
        'average_cost' => 'decimal:2',
    ];

    public function isLowStock(): bool
    {
        return $this->current_stock <= $this->minimum_stock;
    }

    public function batches()
    {
        return $this->hasMany(MedicineBatch::class)->orderBy('expiry_date');
    }

    public function availableBatches()
    {
        return $this->batches()->where('quantity_remaining', '>', 0)->where('expiry_date', '>', now());
    }
}

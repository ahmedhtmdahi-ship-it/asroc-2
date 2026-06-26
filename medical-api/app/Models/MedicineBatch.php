<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicineBatch extends Model
{
    protected $fillable = [
        'medicine_id', 'supplier_id', 'received_by', 'batch_number',
        'expiry_date', 'quantity_received', 'quantity_remaining',
        'purchase_price_per_unit', 'received_at', 'notes',
    ];

    protected $casts = [
        'expiry_date'              => 'date',
        'received_at'              => 'date',
        'purchase_price_per_unit'  => 'decimal:2',
    ];

    public function medicine()
    {
        return $this->belongsTo(Medicine::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function isExpired(): bool
    {
        return $this->expiry_date->isPast();
    }

    public function isExpiringSoon(int $days = 30): bool
    {
        return $this->expiry_date->diffInDays(now()) <= $days && !$this->isExpired();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = ['name', 'contact_name', 'phone', 'email', 'address', 'is_active', 'notes'];

    protected $casts = ['is_active' => 'boolean'];

    public function batches()
    {
        return $this->hasMany(MedicineBatch::class);
    }
}

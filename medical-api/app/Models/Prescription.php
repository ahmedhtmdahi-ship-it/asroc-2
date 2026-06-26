<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    protected $fillable = ['checkup_request_id', 'dispensed_by', 'dispensed_at', 'notes'];

    protected $casts = [
        'dispensed_at' => 'datetime',
    ];

    public function checkupRequest()
    {
        return $this->belongsTo(CheckupRequest::class);
    }

    public function dispensedBy()
    {
        return $this->belongsTo(User::class, 'dispensed_by');
    }

    public function items()
    {
        return $this->hasMany(PrescriptionItem::class);
    }
}

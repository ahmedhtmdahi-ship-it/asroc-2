<?php

namespace App\Models;

use App\Enums\DispensingMonth;
use Illuminate\Database\Eloquent\Model;

class MonthlyDispensingRecord extends Model
{
    protected $fillable = [
        'monthly_treatment_id',
        'month',
        'status',
        'dispensed_by',
        'dispensed_at',
    ];

    protected $casts = [
        'status' => DispensingMonth::class,
        'month' => 'date',
        'dispensed_at' => 'datetime',
    ];

    public function monthlyTreatment()
    {
        return $this->belongsTo(MonthlyTreatment::class);
    }

    public function dispensedBy()
    {
        return $this->belongsTo(User::class, 'dispensed_by');
    }
}

<?php

namespace App\Models;

use App\Enums\MonthlyTreatmentStatus;
use App\Enums\ReviewType;
use Illuminate\Database\Eloquent\Model;

class MonthlyTreatment extends Model
{
    protected $fillable = [
        'employee_id',
        'beneficiary_type',
        'disease_name',
        'status',
        'review_type',
        'last_reviewed_at',
        'doctor_id',
        'notes',
    ];

    protected $casts = [
        'status' => MonthlyTreatmentStatus::class,
        'review_type' => ReviewType::class,
        'last_reviewed_at' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function medications()
    {
        return $this->hasMany(MonthlyTreatmentMedication::class);
    }

    public function dispensingRecords()
    {
        return $this->hasMany(MonthlyDispensingRecord::class);
    }
}

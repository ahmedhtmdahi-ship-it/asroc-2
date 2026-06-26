<?php

namespace App\Models;

use App\Enums\CheckupStatus;
use App\Enums\CheckupType;
use Illuminate\Database\Eloquent\Model;

class CheckupRequest extends Model
{
    protected $fillable = [
        'employee_id',
        'department_id',
        'type',
        'status',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'postponed_until',
        'checked_out_at',
        'returned_at',
        'security_officer_id',
        'target_clinic',
    ];

    protected $casts = [
        'type' => CheckupType::class,
        'status' => CheckupStatus::class,
        'approved_at' => 'datetime',
        'checked_out_at' => 'datetime',
        'returned_at' => 'datetime',
        'postponed_until' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function securityOfficer()
    {
        return $this->belongsTo(User::class, 'security_officer_id');
    }

    public function diagnosis()
    {
        return $this->hasOne(Diagnosis::class);
    }

    public function prescription()
    {
        return $this->hasOne(Prescription::class);
    }

    public function externalReferral()
    {
        return $this->hasOne(ExternalReferral::class);
    }

    public function sickLeave()
    {
        return $this->hasOne(SickLeave::class);
    }
}

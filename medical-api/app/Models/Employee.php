<?php

namespace App\Models;

use App\Enums\EmployeeType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'financial_number',
        'national_id',
        'department_id',
        'job_title',
        'type',
        'phone',
        'checkups_used_this_month',
        'checkup_month_reset',
    ];

    protected $casts = [
        'type' => EmployeeType::class,
        'checkup_month_reset' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function familyMembers()
    {
        return $this->hasMany(FamilyMember::class);
    }

    public function checkupRequests()
    {
        return $this->hasMany(CheckupRequest::class);
    }

    public function monthlyTreatments()
    {
        return $this->hasMany(MonthlyTreatment::class);
    }
}

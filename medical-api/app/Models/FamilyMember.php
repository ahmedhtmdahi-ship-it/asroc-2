<?php

namespace App\Models;

use App\Enums\FamilyRelation;
use Illuminate\Database\Eloquent\Model;

class FamilyMember extends Model
{
    protected $fillable = [
        'employee_id',
        'name',
        'national_id',
        'relation',
        'birth_date',
        'is_active',
    ];

    protected $casts = [
        'relation' => FamilyRelation::class,
        'birth_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

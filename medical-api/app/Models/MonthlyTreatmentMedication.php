<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonthlyTreatmentMedication extends Model
{
    protected $fillable = ['monthly_treatment_id', 'medicine_id', 'medicine_name', 'dosage'];

    public function monthlyTreatment()
    {
        return $this->belongsTo(MonthlyTreatment::class);
    }

    public function medicine()
    {
        return $this->belongsTo(Medicine::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrescriptionItem extends Model
{
    protected $fillable = [
        'prescription_id',
        'medicine_id',
        'medicine_name',
        'dosage',
        'duration',
        'is_available',
        'medicine_batch_id',
        'unit_cost',
        'quantity_dispensed',
    ];

    protected $casts = [
        'is_available'      => 'boolean',
        'unit_cost'         => 'decimal:2',
        'quantity_dispensed' => 'integer',
    ];

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    public function medicine()
    {
        return $this->belongsTo(Medicine::class);
    }

    public function medicineBatch()
    {
        return $this->belongsTo(MedicineBatch::class, 'medicine_batch_id');
    }
}

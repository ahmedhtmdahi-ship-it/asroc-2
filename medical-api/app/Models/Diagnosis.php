<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Diagnosis extends Model
{
    protected $fillable = ['checkup_request_id', 'doctor_id', 'diagnosis_text'];

    public function checkupRequest()
    {
        return $this->belongsTo(CheckupRequest::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
}

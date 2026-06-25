<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SickLeave extends Model
{
    protected $fillable = ['checkup_request_id', 'days_count', 'reason', 'start_date'];

    protected $casts = [
        'start_date' => 'date',
    ];

    public function checkupRequest()
    {
        return $this->belongsTo(CheckupRequest::class);
    }
}

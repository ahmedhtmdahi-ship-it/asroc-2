<?php

namespace App\Models;

use App\Enums\ReferralStatus;
use Illuminate\Database\Eloquent\Model;

class ExternalReferral extends Model
{
    protected $fillable = [
        'checkup_request_id',
        'external_provider_id',
        'specialty',
        'reason',
        'notes',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'pdf_path',
    ];

    protected $casts = [
        'status' => ReferralStatus::class,
        'reviewed_at' => 'datetime',
    ];

    public function checkupRequest()
    {
        return $this->belongsTo(CheckupRequest::class);
    }

    public function externalProvider()
    {
        return $this->belongsTo(ExternalProvider::class);
    }

    public function reviewedBy()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

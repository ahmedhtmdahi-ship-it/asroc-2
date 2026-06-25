<?php

namespace App\Events;

use App\Models\ExternalReferral;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ExternalReferralCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public ExternalReferral $referral) {}
}

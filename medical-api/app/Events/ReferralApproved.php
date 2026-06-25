<?php

namespace App\Events;

use App\Models\ExternalReferral;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReferralApproved
{
    use Dispatchable, SerializesModels;

    public function __construct(public ExternalReferral $referral) {}
}

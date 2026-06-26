<?php

namespace App\Listeners;

use App\Events\ReferralApproved;
use Illuminate\Support\Facades\Log;

class GeneratePdfOnReferralApproval
{
    public function handle(ReferralApproved $event): void
    {
        Log::info('PDF generation queued — referral #' . $event->referral->id);
    }
}

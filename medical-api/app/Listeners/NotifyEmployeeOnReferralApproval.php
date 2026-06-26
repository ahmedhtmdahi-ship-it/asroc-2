<?php

namespace App\Listeners;

use App\Events\ReferralApproved;
use App\Events\ReferralRejected;
use Illuminate\Support\Facades\Log;

class NotifyEmployeeOnReferralApproval
{
    public function handle(ReferralApproved|ReferralRejected $event): void
    {
        Log::info('Employee notified of referral decision — referral #' . $event->referral->id);
    }
}

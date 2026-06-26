<?php

namespace App\Listeners;

use App\Events\ExternalReferralCreated;
use Illuminate\Support\Facades\Log;

class NotifyMedicalAdminOnReferral
{
    public function handle(ExternalReferralCreated $event): void
    {
        Log::info('New referral for medical admin review — referral #' . $event->referral->id);
    }
}

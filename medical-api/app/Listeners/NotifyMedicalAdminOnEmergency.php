<?php

namespace App\Listeners;

use App\Events\EmergencyCheckupCreated;
use Illuminate\Support\Facades\Log;

class NotifyMedicalAdminOnEmergency
{
    public function handle(EmergencyCheckupCreated $event): void
    {
        Log::info('Emergency checkup created: #' . $event->checkupRequest->id);
    }
}

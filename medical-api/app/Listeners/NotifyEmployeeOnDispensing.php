<?php

namespace App\Listeners;

use App\Events\MedicationDispensed;
use Illuminate\Support\Facades\Log;

class NotifyEmployeeOnDispensing
{
    public function handle(MedicationDispensed $event): void
    {
        Log::info('Medication dispensed for request #' . $event->prescription->checkup_request_id);
    }
}

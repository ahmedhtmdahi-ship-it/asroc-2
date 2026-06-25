<?php

namespace App\Listeners;

use App\Events\DiagnosisCompleted;
use Illuminate\Support\Facades\Log;

class NotifyPharmacyOnPrescription
{
    public function handle(DiagnosisCompleted $event): void
    {
        Log::info('Prescription written, notify pharmacy — checkup #' . $event->checkupRequest->id);
    }
}

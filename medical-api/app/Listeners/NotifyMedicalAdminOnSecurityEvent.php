<?php

namespace App\Listeners;

use Illuminate\Support\Facades\Log;

class NotifyMedicalAdminOnSecurityEvent
{
    public function handle($event): void
    {
        Log::info('Security event: employee ' . ($event->checkupRequest->employee->user->name ?? 'unknown'));
    }
}

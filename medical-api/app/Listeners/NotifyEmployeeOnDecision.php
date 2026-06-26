<?php

namespace App\Listeners;

use App\Events\CheckupApproved;
use App\Events\CheckupPostponed;
use App\Events\CheckupRejected;
use Illuminate\Support\Facades\Log;

class NotifyEmployeeOnDecision
{
    public function handle(CheckupApproved|CheckupRejected|CheckupPostponed $event): void
    {
        Log::info('Checkup decision — notify employee: #' . $event->checkupRequest->id);
    }
}

<?php

namespace App\Listeners;

use App\Events\CheckupRequestCreated;
use Illuminate\Support\Facades\Log;

class NotifyManagerOnCheckupCreated
{
    public function handle(CheckupRequestCreated $event): void
    {
        Log::info('New checkup request created: #' . $event->checkupRequest->id);
    }
}

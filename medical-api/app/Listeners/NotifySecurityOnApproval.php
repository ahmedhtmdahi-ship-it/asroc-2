<?php

namespace App\Listeners;

use App\Events\CheckupApproved;
use Illuminate\Support\Facades\Log;

class NotifySecurityOnApproval
{
    public function handle(CheckupApproved $event): void
    {
        Log::info('Checkup approved — notify security: #' . $event->checkupRequest->id);
    }
}

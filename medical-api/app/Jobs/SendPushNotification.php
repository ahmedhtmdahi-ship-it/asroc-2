<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $fcmToken,
        public string $title,
        public string $body,
        public array $data = []
    ) {}

    public function handle(): void
    {
        // Log for now — real FCM implementation in future
        Log::info('FCM Push: ' . $this->title . ' → token: ' . substr($this->fcmToken, 0, 10) . '...');
    }
}

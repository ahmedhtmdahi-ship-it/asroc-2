<?php

namespace App\Events;

use App\Models\CheckupRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CheckupRejected
{
    use Dispatchable, SerializesModels;

    public function __construct(public CheckupRequest $checkupRequest) {}
}

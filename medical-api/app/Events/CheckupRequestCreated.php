<?php

namespace App\Events;

use App\Models\CheckupRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CheckupRequestCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public CheckupRequest $checkupRequest) {}
}

<?php

namespace App\Events;

use App\Models\CheckupRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CheckupPostponed
{
    use Dispatchable, SerializesModels;

    public function __construct(public CheckupRequest $checkupRequest) {}
}

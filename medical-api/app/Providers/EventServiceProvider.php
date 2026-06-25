<?php

namespace App\Providers;

use App\Events\CheckupApproved;
use App\Events\CheckupPostponed;
use App\Events\CheckupRejected;
use App\Events\CheckupRequestCreated;
use App\Events\EmergencyCheckupCreated;
use App\Listeners\NotifyEmployeeOnDecision;
use App\Listeners\NotifyMedicalAdminOnEmergency;
use App\Listeners\NotifyManagerOnCheckupCreated;
use App\Listeners\NotifySecurityOnApproval;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        CheckupRequestCreated::class => [
            NotifyManagerOnCheckupCreated::class,
        ],
        EmergencyCheckupCreated::class => [
            NotifyMedicalAdminOnEmergency::class,
        ],
        CheckupApproved::class => [
            NotifySecurityOnApproval::class,
            NotifyEmployeeOnDecision::class,
        ],
        CheckupRejected::class => [
            NotifyEmployeeOnDecision::class,
        ],
        CheckupPostponed::class => [
            NotifyEmployeeOnDecision::class,
        ],
    ];
}

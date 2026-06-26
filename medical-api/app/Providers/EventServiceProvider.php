<?php

namespace App\Providers;

use App\Events\CheckupApproved;
use App\Events\CheckupPostponed;
use App\Events\CheckupRejected;
use App\Events\CheckupRequestCreated;
use App\Events\DiagnosisCompleted;
use App\Events\EmergencyCheckupCreated;
use App\Events\EmployeeCheckedOut;
use App\Events\EmployeeReturned;
use App\Events\ExternalReferralCreated;
use App\Events\MedicationDispensed;
use App\Events\ReferralApproved;
use App\Events\ReferralRejected;
use App\Listeners\GeneratePdfOnReferralApproval;
use App\Listeners\NotifyEmployeeOnDecision;
use App\Listeners\NotifyEmployeeOnDispensing;
use App\Listeners\NotifyEmployeeOnReferralApproval;
use App\Listeners\NotifyMedicalAdminOnEmergency;
use App\Listeners\NotifyMedicalAdminOnReferral;
use App\Listeners\NotifyMedicalAdminOnSecurityEvent;
use App\Listeners\NotifyManagerOnCheckupCreated;
use App\Listeners\NotifyPharmacyOnPrescription;
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
        EmployeeCheckedOut::class => [
            NotifyMedicalAdminOnSecurityEvent::class,
        ],
        EmployeeReturned::class => [
            NotifyMedicalAdminOnSecurityEvent::class,
        ],
        DiagnosisCompleted::class => [
            NotifyPharmacyOnPrescription::class,
        ],
        ExternalReferralCreated::class => [
            NotifyMedicalAdminOnReferral::class,
        ],
        ReferralApproved::class => [
            GeneratePdfOnReferralApproval::class,
            NotifyEmployeeOnReferralApproval::class,
        ],
        ReferralRejected::class => [
            NotifyEmployeeOnReferralApproval::class,
        ],
        MedicationDispensed::class => [
            NotifyEmployeeOnDispensing::class,
        ],
    ];
}

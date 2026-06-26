<?php

namespace App\Services;

use App\Enums\CheckupStatus;
use App\Enums\CheckupType;
use App\Events\CheckupRequestCreated;
use App\Events\EmergencyCheckupCreated;
use App\Models\CheckupRequest;
use App\Models\Employee;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class CheckupService
{
    public function canRequestCheckup(Employee $employee): bool
    {
        $this->resetMonthlyCounterIfNeeded($employee);

        return $employee->checkups_used_this_month < config('medical.monthly_checkup_limit');
    }

    public function getRemainingCheckups(Employee $employee): int
    {
        $this->resetMonthlyCounterIfNeeded($employee);

        return config('medical.monthly_checkup_limit') - $employee->checkups_used_this_month;
    }

    public function resolveTargetClinic(Employee $employee): string
    {
        return ($employee->work_shift ?? 'day') === 'shift'
            ? 'shift_clinic'
            : 'medical_center';
    }

    public function createCheckupRequest(Employee $employee, array $data): CheckupRequest
    {
        $type         = CheckupType::from($data['type']);
        $targetClinic = $this->resolveTargetClinic($employee);

        if ($type === CheckupType::Normal) {
            if (! $this->canRequestCheckup($employee)) {
                throw ValidationException::withMessages([
                    'type' => ['You have reached your monthly checkup limit.'],
                ]);
            }

            $request = CheckupRequest::create([
                'employee_id'   => $employee->id,
                'department_id' => $employee->department_id,
                'type'          => CheckupType::Normal,
                'status'        => CheckupStatus::Pending,
                'notes'         => $data['notes'] ?? null,
                'created_by'    => $employee->user_id,
                'target_clinic' => $targetClinic,
            ]);

            $employee->increment('checkups_used_this_month');

            CheckupRequestCreated::dispatch($request);
        } else {
            // Emergency: bypass manager, auto-approved, no counter increment
            $request = CheckupRequest::create([
                'employee_id'   => $employee->id,
                'department_id' => $employee->department_id,
                'type'          => CheckupType::Emergency,
                'status'        => CheckupStatus::Approved,
                'notes'         => $data['notes'] ?? null,
                'created_by'    => $employee->user_id,
                'approved_at'   => Carbon::now(),
                'target_clinic' => $targetClinic,
            ]);

            EmergencyCheckupCreated::dispatch($request);
        }

        return $request;
    }

    public function cancelRequest(CheckupRequest $request, Employee $employee): void
    {
        if ($request->status !== CheckupStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only pending requests can be cancelled.'],
            ]);
        }

        $request->update(['status' => CheckupStatus::Cancelled]);

        // Refund the slot for normal checkups
        if ($request->type === CheckupType::Normal && $employee->checkups_used_this_month > 0) {
            $employee->decrement('checkups_used_this_month');
        }
    }

    private function resetMonthlyCounterIfNeeded(Employee $employee): void
    {
        $now = Carbon::now();

        $needsReset = is_null($employee->checkup_month_reset)
            || $employee->checkup_month_reset->year !== $now->year
            || $employee->checkup_month_reset->month !== $now->month;

        if ($needsReset) {
            $employee->update([
                'checkups_used_this_month' => 0,
                'checkup_month_reset'      => $now->startOfMonth(),
            ]);
        }
    }
}

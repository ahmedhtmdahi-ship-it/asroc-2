<?php

namespace App\Services;

use App\Enums\CheckupStatus;
use App\Events\EmployeeCheckedOut;
use App\Events\EmployeeReturned;
use App\Models\CheckupRequest;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class SecurityService
{
    /**
     * Register checkout for an approved request.
     */
    public function checkout(CheckupRequest $request, int $securityOfficerId): CheckupRequest
    {
        if ($request->status !== CheckupStatus::Approved) {
            throw new \Exception('الطلب غير مؤهل لتسجيل الخروج');
        }

        $request->status              = CheckupStatus::CheckedOut;
        $request->checked_out_at      = Carbon::now();
        $request->security_officer_id = $securityOfficerId;
        $request->save();

        EmployeeCheckedOut::dispatch($request);

        return $request;
    }

    /**
     * Register return for an employee currently outside.
     */
    public function registerReturn(CheckupRequest $request): CheckupRequest
    {
        $allowedStatuses = [
            CheckupStatus::CheckedOut,
            CheckupStatus::InDiagnosis,
            CheckupStatus::Prescribed,
        ];

        if (! in_array($request->status, $allowedStatuses)) {
            throw new \Exception('الموظف غير مسجل كخارج');
        }

        $request->status      = CheckupStatus::Returned;
        $request->returned_at = Carbon::now();
        $request->save();

        EmployeeReturned::dispatch($request);

        return $request;
    }

    /**
     * Get employees who have been outside beyond the configured threshold.
     */
    public function getLateEmployees(): Collection
    {
        $thresholdHours = config('medical.late_threshold_hours', 3);

        return CheckupRequest::with(['employee.user', 'department'])
            ->whereIn('status', [
                CheckupStatus::CheckedOut,
                CheckupStatus::InDiagnosis,
                CheckupStatus::Prescribed,
            ])
            ->where('checked_out_at', '<', Carbon::now()->subHours($thresholdHours))
            ->get();
    }
}

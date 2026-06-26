<?php

namespace App\Http\Controllers;

use App\Http\Resources\EmployeeResource;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    /**
     * GET /api/employee/profile
     * Return the authenticated user's employee data with department.
     */
    public function profile(Request $request)
    {
        $employee = $request->user()->employee()->with('department')->firstOrFail();

        return new EmployeeResource($employee);
    }

    /**
     * PUT /api/employee/profile
     * Update phone number and/or FCM token for the authenticated employee.
     */
    public function updateProfile(Request $request)
    {
        $user     = $request->user();
        $employee = $user->employee()->firstOrFail();

        $validated = $request->validate([
            'phone'     => ['nullable', 'string', 'max:20'],
            'fcm_token' => ['nullable', 'string', 'max:500'],
            'name'      => ['nullable', 'string', 'max:100'],
        ]);

        if (isset($validated['phone'])) {
            $employee->phone = $validated['phone'];
            $employee->save();
        }

        if (isset($validated['fcm_token'])) {
            $user->fcm_token = $validated['fcm_token'];
            $user->save();
        }

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
            $user->save();
        }

        return new EmployeeResource($employee->fresh(['department']));
    }

    /**
     * GET /api/employee/checkup-balance
     * Return the monthly checkup quota status for the authenticated employee.
     */
    public function checkupBalance(Request $request)
    {
        $employee = $request->user()->employee()->firstOrFail();

        $limit     = config('medical.monthly_checkup_limit', 3);
        $used      = (int) $employee->checkups_used_this_month;
        $remaining = max(0, $limit - $used);

        // Determine the reset date: first day of the next month.
        $resetDate = $employee->checkup_month_reset
            ? $employee->checkup_month_reset->toDateString()
            : now()->startOfMonth()->addMonth()->toDateString();

        return response()->json([
            'used'       => $used,
            'limit'      => $limit,
            'remaining'  => $remaining,
            'reset_date' => $resetDate,
        ]);
    }
}

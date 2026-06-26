<?php

namespace App\Http\Controllers;

use App\Enums\CheckupStatus;
use App\Http\Resources\CheckupRequestResource;
use App\Models\AuditLog;
use App\Models\CheckupRequest;
use App\Services\SecurityService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SecurityController extends Controller
{
    public function __construct(private SecurityService $securityService) {}

    /**
     * List approved requests ready for checkout.
     * Filter: department_id. Paginated 15/page.
     */
    public function approvedRequests(Request $request)
    {
        $query = CheckupRequest::with(['employee.user', 'department'])
            ->where('status', CheckupStatus::Approved);

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        $requests = $query->latest()->paginate(15);

        return CheckupRequestResource::collection($requests);
    }

    /**
     * List employees currently outside (checked_out, in_diagnosis, or prescribed).
     */
    public function outsideNow(Request $request)
    {
        $requests = CheckupRequest::with(['employee.user', 'department'])
            ->whereIn('status', [
                CheckupStatus::CheckedOut,
                CheckupStatus::InDiagnosis,
                CheckupStatus::Prescribed,
                CheckupStatus::Dispensed,
            ])
            ->latest('checked_out_at')
            ->paginate(15);

        return CheckupRequestResource::collection($requests);
    }

    /**
     * List employees who have been outside beyond the late threshold.
     * Adds hours_outside to each entry.
     */
    public function lateEmployees()
    {
        $lateRequests = $this->securityService->getLateEmployees();

        $data = $lateRequests->map(function (CheckupRequest $checkupRequest) {
            $resource = (new CheckupRequestResource($checkupRequest))->resolve();
            $resource['hours_outside'] = Carbon::now()->diffInHours($checkupRequest->checked_out_at);
            return $resource;
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Register checkout for an approved request.
     */
    public function checkout(Request $request, $id)
    {
        $checkupRequest = CheckupRequest::findOrFail($id);

        try {
            $updated = $this->securityService->checkout($checkupRequest, $request->user()->id);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        AuditLog::record('checkout', (string) $checkupRequest->id, 'approved', 'checked_out');

        return new CheckupRequestResource($updated->load(['employee.user', 'department', 'securityOfficer']));
    }

    /**
     * Recent checkout/return activity log (last 100 events).
     */
    public function logs(Request $request)
    {
        $logs = AuditLog::whereIn('action', ['checkout', 'return'])
            ->latest()
            ->paginate($request->get('per_page', 50));

        return response()->json([
            'data' => $logs->map(fn ($log) => [
                'id'           => $log->id,
                'action'       => $log->action,
                'request_id'   => $log->request_id,
                'performed_by' => $log->user_name,
                'created_at'   => $log->created_at,
            ]),
            'meta' => [
                'total'        => $logs->total(),
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
            ],
        ]);
    }

    /**
     * Register return for an employee currently outside.
     */
    public function return($id)
    {
        $checkupRequest = CheckupRequest::findOrFail($id);

        try {
            $updated = $this->securityService->registerReturn($checkupRequest);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        AuditLog::record('return', (string) $checkupRequest->id, 'checked_out', 'returned');

        return new CheckupRequestResource($updated->load(['employee.user', 'department', 'securityOfficer']));
    }
}

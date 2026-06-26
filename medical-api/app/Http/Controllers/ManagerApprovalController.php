<?php

namespace App\Http\Controllers;

use App\Enums\CheckupStatus;
use App\Enums\CheckupType;
use App\Events\CheckupApproved;
use App\Events\CheckupPostponed;
use App\Events\CheckupRejected;
use App\Http\Resources\CheckupRequestResource;
use App\Models\AuditLog;
use App\Models\CheckupRequest;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ManagerApprovalController extends Controller
{
    /**
     * Get department IDs managed by the authenticated user.
     */
    private function managedDepartmentIds(Request $request): array
    {
        return Department::where('manager_id', $request->user()->id)
            ->pluck('id')
            ->toArray();
    }

    /**
     * List pending requests from manager's departments.
     * Filter: status (default: pending). Paginated 15/page.
     */
    public function index(Request $request)
    {
        $departmentIds = $this->managedDepartmentIds($request);

        $status = $request->filled('status')
            ? CheckupStatus::from($request->status)
            : CheckupStatus::Pending;

        $requests = CheckupRequest::with(['employee.user', 'department', 'createdBy', 'approvedBy'])
            ->whereIn('department_id', $departmentIds)
            ->where('status', $status)
            ->latest()
            ->paginate(15);

        return CheckupRequestResource::collection($requests);
    }

    /**
     * All requests (any status) from manager's departments. For reports.
     */
    public function allRequests(Request $request)
    {
        $departmentIds = $this->managedDepartmentIds($request);

        $query = CheckupRequest::with(['employee.user', 'department', 'createdBy', 'approvedBy'])
            ->whereIn('department_id', $departmentIds);

        if ($request->filled('status')) {
            $query->where('status', CheckupStatus::from($request->status));
        }

        $requests = $query->latest()->paginate(15);

        return CheckupRequestResource::collection($requests);
    }

    /**
     * Approve a pending request.
     */
    public function approve(Request $request, $id)
    {
        $departmentIds = $this->managedDepartmentIds($request);

        $checkupRequest = CheckupRequest::whereIn('department_id', $departmentIds)
            ->findOrFail($id);

        if ($checkupRequest->status !== CheckupStatus::Pending) {
            return response()->json(['message' => 'Only pending requests can be approved.'], 422);
        }

        $checkupRequest->update([
            'status'      => CheckupStatus::Approved,
            'approved_by' => $request->user()->id,
            'approved_at' => Carbon::now(),
        ]);

        AuditLog::record('approve_request', (string) $checkupRequest->id, 'pending', 'approved');
        CheckupApproved::dispatch($checkupRequest);

        return new CheckupRequestResource($checkupRequest->load(['employee.user', 'department', 'createdBy', 'approvedBy']));
    }

    /**
     * Reject a pending request with a reason.
     */
    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500'],
        ]);

        $departmentIds = $this->managedDepartmentIds($request);

        $checkupRequest = CheckupRequest::whereIn('department_id', $departmentIds)
            ->findOrFail($id);

        if ($checkupRequest->status !== CheckupStatus::Pending) {
            return response()->json(['message' => 'Only pending requests can be rejected.'], 422);
        }

        $checkupRequest->update([
            'status'           => CheckupStatus::Rejected,
            'rejection_reason' => $validated['rejection_reason'],
            'approved_by'      => $request->user()->id,
            'approved_at'      => Carbon::now(),
        ]);

        AuditLog::record('reject_request', (string) $checkupRequest->id, 'pending', 'rejected', [
            'reason' => $validated['rejection_reason'],
        ]);

        // Refund the monthly slot for normal checkups
        if ($checkupRequest->type === CheckupType::Normal) {
            $employee = $checkupRequest->employee;
            if ($employee && $employee->checkups_used_this_month > 0) {
                $employee->decrement('checkups_used_this_month');
            }
        }

        CheckupRejected::dispatch($checkupRequest);

        return new CheckupRequestResource($checkupRequest->load(['employee.user', 'department', 'createdBy', 'approvedBy']));
    }

    /**
     * Postpone a pending request with a future date.
     */
    public function postpone(Request $request, $id)
    {
        $validated = $request->validate([
            'postponed_until' => ['required', 'date', 'after:today'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $departmentIds = $this->managedDepartmentIds($request);

        $checkupRequest = CheckupRequest::whereIn('department_id', $departmentIds)
            ->findOrFail($id);

        if ($checkupRequest->status !== CheckupStatus::Pending) {
            return response()->json(['message' => 'Only pending requests can be postponed.'], 422);
        }

        $checkupRequest->update([
            'status'          => CheckupStatus::Postponed,
            'postponed_until' => $validated['postponed_until'],
            'notes'           => $validated['notes'] ?? $checkupRequest->notes,
        ]);

        AuditLog::record('postpone_request', (string) $checkupRequest->id, 'pending', 'postponed', [
            'postponed_until' => $validated['postponed_until'],
        ]);
        CheckupPostponed::dispatch($checkupRequest);

        return new CheckupRequestResource($checkupRequest->load(['employee.user', 'department', 'createdBy', 'approvedBy']));
    }

    /**
     * All requests across ALL departments — for medical_admin / system_admin / top_management.
     * Supports: status, type, department_id filters. Paginated 50/page.
     */
    public function globalRequests(Request $request)
    {
        $query = CheckupRequest::with(['employee.user', 'department', 'createdBy', 'approvedBy']);

        if ($request->filled('status')) {
            $query->where('status', CheckupStatus::from($request->status));
        }
        if ($request->filled('type')) {
            $query->where('type', CheckupType::from($request->type));
        }
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        $requests = $query->latest()->paginate(50);

        return CheckupRequestResource::collection($requests);
    }
}

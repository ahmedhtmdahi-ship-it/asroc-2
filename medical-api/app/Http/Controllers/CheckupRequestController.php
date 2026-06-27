<?php

namespace App\Http\Controllers;

use App\Enums\CheckupStatus;
use App\Enums\CheckupType;
use App\Http\Resources\CheckupRequestResource;
use App\Models\AuditLog;
use App\Models\CheckupRequest;
use App\Services\CheckupService;
use Illuminate\Http\Request;

class CheckupRequestController extends Controller
{
    public function __construct(private CheckupService $checkupService) {}

    /**
     * Employee sees only their own requests.
     * Filters: status, type. Paginated 10/page.
     */
    public function index(Request $request)
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $query = CheckupRequest::with(['employee.user', 'department', 'createdBy', 'approvedBy'])
            ->where('employee_id', $employee->id);

        if ($request->filled('status')) {
            $query->where('status', CheckupStatus::from($request->status));
        }

        if ($request->filled('type')) {
            $query->where('type', CheckupType::from($request->type));
        }

        $requests = $query->latest()->paginate((int) $request->get('per_page', 10));

        return CheckupRequestResource::collection($requests);
    }

    /**
     * Create a new checkup request.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type'  => ['required', 'in:normal,emergency'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $employee = $request->user()->employee;

        if (! $employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $checkupRequest = $this->checkupService->createCheckupRequest($employee, $validated);

        AuditLog::record('create_request', (string) $checkupRequest->id, null, 'pending', [
            'type' => $validated['type'],
        ]);

        return (new CheckupRequestResource($checkupRequest))->response()->setStatusCode(201);
    }

    /**
     * Show a single request with full nested data.
     */
    public function show(Request $request, $id)
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $checkupRequest = CheckupRequest::with([
            'employee.user',
            'department',
            'createdBy',
            'approvedBy',
            'diagnosis.doctor',
            'prescription.items',
            'prescription.dispensedBy',
            'externalReferral.externalProvider',
            'sickLeave',
            'securityOfficer',
        ])->where('employee_id', $employee->id)->findOrFail($id);

        return new CheckupRequestResource($checkupRequest);
    }

    /**
     * Cancel a pending request (only own requests).
     */
    public function cancel(Request $request, $id)
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $checkupRequest = CheckupRequest::where('employee_id', $employee->id)->findOrFail($id);

        $statusBefore = $checkupRequest->status->value;
        $this->checkupService->cancelRequest($checkupRequest, $employee);

        AuditLog::record('cancel_request', (string) $checkupRequest->id, $statusBefore, 'cancelled');

        return new CheckupRequestResource($checkupRequest->load(['employee.user', 'department', 'createdBy', 'approvedBy']));
    }
}

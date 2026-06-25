<?php

namespace App\Http\Controllers;

use App\Http\Resources\MonthlyTreatmentResource;
use App\Models\Employee;
use App\Models\MonthlyDispensingRecord;
use App\Models\MonthlyTreatment;
use App\Services\MonthlyTreatmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MonthlyTreatmentController extends Controller
{
    public function __construct(private MonthlyTreatmentService $service) {}

    /**
     * List all monthly treatments with optional filters.
     * Filters: status, employee_id, beneficiary_type
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = MonthlyTreatment::with(['employee.user', 'doctor', 'medications']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('beneficiary_type')) {
            $query->where('beneficiary_type', $request->beneficiary_type);
        }

        return MonthlyTreatmentResource::collection($query->paginate(15));
    }

    /**
     * Doctor creates a new monthly treatment for an employee.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id'                    => ['required', 'integer', 'exists:employees,id'],
            'beneficiary_type'               => ['required', 'in:employee,pensioner'],
            'disease_name'                   => ['required', 'string', 'max:255'],
            'review_type'                    => ['required', 'in:internal,external'],
            'notes'                          => ['nullable', 'string'],
            'medications'                    => ['required', 'array', 'min:1'],
            'medications.*.medicine_name'    => ['required', 'string', 'max:255'],
            'medications.*.dosage'           => ['required', 'string', 'max:255'],
            'medications.*.medicine_id'      => ['nullable', 'integer', 'exists:medicines,id'],
        ]);

        $employee = Employee::findOrFail($validated['employee_id']);

        $treatment = $this->service->create(
            $employee,
            $request->user()->id,
            $validated
        );

        return (new MonthlyTreatmentResource($treatment))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Show treatment details with medications and full dispensing history.
     */
    public function show(int $id): JsonResponse
    {
        $treatment = MonthlyTreatment::with([
            'employee.user',
            'doctor',
            'medications.medicine',
            'dispensingRecords' => fn ($q) => $q->orderByDesc('month'),
        ])->findOrFail($id);

        return response()->json(new MonthlyTreatmentResource($treatment));
    }

    /**
     * Update (replace) the medications list for a treatment.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'medications'                    => ['required', 'array', 'min:1'],
            'medications.*.medicine_name'    => ['required', 'string', 'max:255'],
            'medications.*.dosage'           => ['required', 'string', 'max:255'],
            'medications.*.medicine_id'      => ['nullable', 'integer', 'exists:medicines,id'],
        ]);

        $treatment = MonthlyTreatment::findOrFail($id);
        $treatment = $this->service->updateMedications($treatment, $validated['medications']);

        return response()->json(new MonthlyTreatmentResource($treatment));
    }

    /**
     * Pause a monthly treatment.
     */
    public function pause(int $id): JsonResponse
    {
        $treatment = MonthlyTreatment::findOrFail($id);
        $treatment = $this->service->pause($treatment);

        return response()->json([
            'message'   => 'تم إيقاف العلاج الشهري مؤقتًا',
            'treatment' => new MonthlyTreatmentResource($treatment),
        ]);
    }

    /**
     * Discontinue a monthly treatment.
     */
    public function discontinue(int $id): JsonResponse
    {
        $treatment = MonthlyTreatment::findOrFail($id);
        $treatment = $this->service->discontinue($treatment);

        return response()->json([
            'message'   => 'تم إيقاف العلاج الشهري نهائيًا',
            'treatment' => new MonthlyTreatmentResource($treatment),
        ]);
    }

    /**
     * List all dispensing records for a treatment, newest first.
     */
    public function dispensingHistory(int $id): JsonResponse
    {
        // Ensure the treatment exists
        MonthlyTreatment::findOrFail($id);

        $records = MonthlyDispensingRecord::where('monthly_treatment_id', $id)
            ->orderByDesc('month')
            ->get();

        return response()->json($records);
    }
}

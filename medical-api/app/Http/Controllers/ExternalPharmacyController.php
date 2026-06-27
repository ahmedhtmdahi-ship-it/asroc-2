<?php

namespace App\Http\Controllers;

use App\Enums\DispensingMonth;
use App\Enums\MonthlyTreatmentStatus;
use App\Models\Employee;
use App\Models\MonthlyDispensingRecord;
use App\Models\MonthlyTreatment;
use App\Services\MonthlyTreatmentService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExternalPharmacyController extends Controller
{
    public function __construct(private MonthlyTreatmentService $service) {}

    /**
     * List pending MonthlyDispensingRecords for active treatments in the current month.
     */
    public function monthlyTreatments(Request $request): JsonResponse
    {
        $records = MonthlyDispensingRecord::with([
                'monthlyTreatment.employee.user',
                'monthlyTreatment.medications',
            ])
            ->where('status', DispensingMonth::Pending)
            ->whereHas('monthlyTreatment', fn ($q) => $q->where('status', MonthlyTreatmentStatus::Active))
            ->whereYear('month', now()->year)
            ->whereMonth('month', now()->month)
            ->paginate((int) $request->get('per_page', 15));

        return response()->json($records);
    }

    /**
     * Search beneficiaries (pensioners / retired employees) by name, national ID, or financial number.
     * Returns their active monthly treatments.
     */
    public function searchBeneficiary(Request $request): JsonResponse
    {
        $request->validate(['q' => ['required', 'string', 'min:2']]);
        $q = $request->q;

        $employees = Employee::with(['user', 'monthlyTreatments.medications'])
            ->whereHas('user', fn ($query) =>
                $query->where('name', 'like', "%{$q}%")
            )
            ->orWhere('financial_number', 'like', "%{$q}%")
            ->orWhere('national_id', 'like', "%{$q}%")
            ->limit(10)
            ->get();

        $results = $employees->map(fn (Employee $emp) => [
            'id'               => $emp->id,
            'name'             => $emp->user?->name,
            'financial_number' => $emp->financial_number,
            'national_id'      => $emp->national_id,
            'job_title'        => $emp->job_title,
            'type'             => $emp->type?->value,
            'monthly_treatments' => $emp->monthlyTreatments
                ->where('status', MonthlyTreatmentStatus::Active->value)
                ->map(fn ($t) => [
                    'id'           => $t->id,
                    'disease_name' => $t->disease_name,
                    'medications'  => $t->medications->map(fn ($m) => [
                        'medicine_name' => $m->medicine_name,
                        'dosage'        => $m->dosage,
                    ]),
                ]),
        ]);

        return response()->json(['data' => $results]);
    }

    /**
     * Dispense a monthly treatment record for the current month.
     */
    public function dispense(Request $request, int $id): JsonResponse
    {
        $record = MonthlyDispensingRecord::findOrFail($id);

        if ($record->status === DispensingMonth::Dispensed) {
            return response()->json(['message' => 'تم الصرف مسبقًا'], 422);
        }

        try {
            $record = $this->service->dispenseMonthly($record, $request->user()->id);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'تم تأكيد الصرف بنجاح',
            'record'  => $record,
        ]);
    }
}

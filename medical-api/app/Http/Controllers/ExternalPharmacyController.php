<?php

namespace App\Http\Controllers;

use App\Enums\DispensingMonth;
use App\Enums\MonthlyTreatmentStatus;
use App\Models\MonthlyDispensingRecord;
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
            ->paginate(15);

        return response()->json($records);
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

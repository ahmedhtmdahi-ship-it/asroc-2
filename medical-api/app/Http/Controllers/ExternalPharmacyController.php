<?php

namespace App\Http\Controllers;

use App\Enums\DispensingMonth;
use App\Models\MonthlyDispensingRecord;
use App\Services\PharmacyService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ExternalPharmacyController extends Controller
{
    public function __construct(private PharmacyService $pharmacyService) {}

    public function monthlyTreatments(Request $request)
    {
        $records = MonthlyDispensingRecord::where('status', DispensingMonth::Pending)
            ->where('month', Carbon::now()->startOfMonth()->toDateString())
            ->with([
                'monthlyTreatment.employee.user',
                'monthlyTreatment.medications',
            ])
            ->paginate(15);

        return response()->json($records);
    }

    public function dispense(Request $request, $id)
    {
        $record = MonthlyDispensingRecord::findOrFail($id);

        try {
            $record = $this->pharmacyService->dispenseMonthlyTreatment(
                $record,
                $request->user()->id
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'تم صرف العلاج الشهري بنجاح',
            'record' => $record,
        ]);
    }
}

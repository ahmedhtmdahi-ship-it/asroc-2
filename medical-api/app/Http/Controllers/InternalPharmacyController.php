<?php

namespace App\Http\Controllers;

use App\Http\Resources\PrescriptionResource;
use App\Models\AuditLog;
use App\Models\Prescription;
use App\Services\PharmacyService;
use Illuminate\Http\Request;

class InternalPharmacyController extends Controller
{
    public function __construct(private PharmacyService $pharmacyService) {}

    public function index(Request $request)
    {
        $prescriptions = Prescription::whereNull('dispensed_at')
            ->with([
                'checkupRequest.employee.user',
                'checkupRequest.department',
                'items.medicine',
            ])
            ->paginate((int) $request->get('per_page', 10));

        return PrescriptionResource::collection($prescriptions);
    }

    public function show($id)
    {
        $prescription = Prescription::with([
            'checkupRequest.employee.user',
            'checkupRequest.department',
            'items.medicine',
            'dispensedBy',
        ])->findOrFail($id);

        return new PrescriptionResource($prescription);
    }

    public function dispense(Request $request, $id)
    {
        $prescription = Prescription::with('items.medicine', 'checkupRequest')->findOrFail($id);

        try {
            $prescription = $this->pharmacyService->dispensePrescription(
                $prescription,
                $request->user()->id
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        AuditLog::record('dispense_prescription', (string) $prescription->checkup_request_id, 'prescribed', 'dispensed', [
            'prescription_id' => $prescription->id,
        ]);

        return new PrescriptionResource($prescription);
    }
}

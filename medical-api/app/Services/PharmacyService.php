<?php

namespace App\Services;

use App\Enums\CheckupStatus;
use App\Enums\DispensingMonth;
use App\Events\MedicationDispensed;
use App\Models\MonthlyDispensingRecord;
use App\Models\Prescription;
use Illuminate\Support\Facades\DB;

class PharmacyService
{
    public function dispensePrescription(Prescription $prescription, int $pharmacistId): Prescription
    {
        if ($prescription->dispensed_at !== null) {
            throw new \Exception('تم صرف هذه الروشتة مسبقًا');
        }

        DB::transaction(function () use ($prescription, $pharmacistId) {
            foreach ($prescription->items as $item) {
                if ($item->is_available && $item->medicine_id !== null) {
                    $medicine = $item->medicine;

                    if ($medicine->current_stock > 0) {
                        $medicine->decrement('current_stock');
                    } else {
                        $item->is_available = false;
                        $item->save();
                    }
                }
            }

            $prescription->dispensed_by = $pharmacistId;
            $prescription->dispensed_at = now();
            $prescription->save();

            $prescription->checkupRequest->update([
                'status' => CheckupStatus::Dispensed,
            ]);
        });

        MedicationDispensed::dispatch($prescription);

        return $prescription->load(['items.medicine', 'checkupRequest', 'dispensedBy']);
    }

    public function dispenseMonthlyTreatment(MonthlyDispensingRecord $record, int $pharmacistId): MonthlyDispensingRecord
    {
        if ($record->status !== DispensingMonth::Pending) {
            throw new \Exception('تم صرف هذا الشهر مسبقًا');
        }

        $record->status = DispensingMonth::Dispensed;
        $record->dispensed_by = $pharmacistId;
        $record->dispensed_at = now();
        $record->save();

        return $record;
    }
}

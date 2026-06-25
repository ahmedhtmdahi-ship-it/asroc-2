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
                if (!$item->is_available || !$item->medicine_id) continue;

                // FIFO: get earliest-expiry batch with stock
                $batch = \App\Models\MedicineBatch::where('medicine_id', $item->medicine_id)
                    ->where('quantity_remaining', '>=', $item->quantity_dispensed)
                    ->where('expiry_date', '>', now())
                    ->orderBy('expiry_date')
                    ->first();

                if ($batch) {
                    $batch->decrement('quantity_remaining', $item->quantity_dispensed);
                    $item->update([
                        'medicine_batch_id' => $batch->id,
                        'unit_cost' => $batch->purchase_price_per_unit,
                    ]);
                    // Update medicine total stock
                    $batch->medicine->decrement('current_stock', $item->quantity_dispensed);
                } else {
                    $item->update(['is_available' => false]);
                }
            }

            $prescription->update([
                'dispensed_by' => $pharmacistId,
                'dispensed_at' => now(),
            ]);

            $prescription->checkupRequest()->update([
                'status' => \App\Enums\CheckupStatus::Dispensed->value,
            ]);
        });

        \App\Events\MedicationDispensed::dispatch($prescription->fresh(['items', 'checkupRequest']));
        return $prescription->fresh(['items.medicine', 'checkupRequest']);
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

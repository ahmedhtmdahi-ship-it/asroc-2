<?php

namespace App\Services;

use App\Enums\DispensingMonth;
use App\Enums\MonthlyTreatmentStatus;
use App\Models\Employee;
use App\Models\MonthlyDispensingRecord;
use App\Models\MonthlyTreatment;
use App\Models\MonthlyTreatmentMedication;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class MonthlyTreatmentService
{
    /**
     * Create a new monthly treatment with medications and an initial dispensing record.
     *
     * @param Employee $employee
     * @param int      $doctorId
     * @param array    $data  Keys: beneficiary_type, disease_name, review_type, notes, medications[]
     * @return MonthlyTreatment
     */
    public function create(Employee $employee, int $doctorId, array $data): MonthlyTreatment
    {
        $treatment = MonthlyTreatment::create([
            'employee_id'      => $employee->id,
            'doctor_id'        => $doctorId,
            'beneficiary_type' => $data['beneficiary_type'],
            'disease_name'     => $data['disease_name'],
            'review_type'      => $data['review_type'],
            'notes'            => $data['notes'] ?? null,
            'status'           => MonthlyTreatmentStatus::Active,
            'last_reviewed_at' => Carbon::today(),
        ]);

        foreach ($data['medications'] as $med) {
            MonthlyTreatmentMedication::create([
                'monthly_treatment_id' => $treatment->id,
                'medicine_id'          => $med['medicine_id'] ?? null,
                'medicine_name'        => $med['medicine_name'],
                'dosage'               => $med['dosage'],
            ]);
        }

        // Create the dispensing record for the current month
        MonthlyDispensingRecord::create([
            'monthly_treatment_id' => $treatment->id,
            'month'                => Carbon::now()->startOfMonth()->toDateString(),
            'status'               => DispensingMonth::Pending,
        ]);

        return $treatment->load(['employee.user', 'doctor', 'medications.medicine', 'dispensingRecords']);
    }

    /**
     * Replace all medications on a treatment and mark it as modified.
     *
     * @param MonthlyTreatment $treatment
     * @param array            $medications
     * @return MonthlyTreatment
     */
    public function updateMedications(MonthlyTreatment $treatment, array $medications): MonthlyTreatment
    {
        // Remove existing medications
        MonthlyTreatmentMedication::where('monthly_treatment_id', $treatment->id)->delete();

        // Insert new medications
        foreach ($medications as $med) {
            MonthlyTreatmentMedication::create([
                'monthly_treatment_id' => $treatment->id,
                'medicine_id'          => $med['medicine_id'] ?? null,
                'medicine_name'        => $med['medicine_name'],
                'dosage'               => $med['dosage'],
            ]);
        }

        $treatment->status = MonthlyTreatmentStatus::Modified;
        $treatment->save();

        return $treatment->load(['employee.user', 'doctor', 'medications.medicine']);
    }

    /**
     * Pause a monthly treatment.
     *
     * @param MonthlyTreatment $treatment
     * @return MonthlyTreatment
     */
    public function pause(MonthlyTreatment $treatment): MonthlyTreatment
    {
        $treatment->status = MonthlyTreatmentStatus::Paused;
        $treatment->save();

        return $treatment;
    }

    /**
     * Discontinue a monthly treatment.
     *
     * @param MonthlyTreatment $treatment
     * @return MonthlyTreatment
     */
    public function discontinue(MonthlyTreatment $treatment): MonthlyTreatment
    {
        $treatment->status = MonthlyTreatmentStatus::Discontinued;
        $treatment->save();

        return $treatment;
    }

    /**
     * Get all active treatments that have a pending dispensing record for the current month.
     *
     * @return Collection
     */
    public function getDueThisMonth(): Collection
    {
        return MonthlyTreatment::with(['employee.user', 'medications.medicine'])
            ->where('status', MonthlyTreatmentStatus::Active)
            ->whereHas('dispensingRecords', function ($query) {
                $query->where('status', DispensingMonth::Pending)
                      ->whereYear('month', now()->year)
                      ->whereMonth('month', now()->month);
            })
            ->get();
    }

    /**
     * Mark a dispensing record as dispensed and create next month's record if treatment is still active.
     *
     * @param MonthlyDispensingRecord $record
     * @param int                     $dispenserId
     * @return MonthlyDispensingRecord
     */
    public function dispenseMonthly(MonthlyDispensingRecord $record, int $dispenserId): MonthlyDispensingRecord
    {
        $record->status       = DispensingMonth::Dispensed;
        $record->dispensed_by = $dispenserId;
        $record->dispensed_at = now();
        $record->save();

        // Create next month's dispensing record if treatment is still active
        $treatment = $record->monthlyTreatment;
        if ($treatment && $treatment->status === MonthlyTreatmentStatus::Active) {
            $nextMonth = Carbon::parse($record->month)->addMonth()->startOfMonth();

            $exists = MonthlyDispensingRecord::where('monthly_treatment_id', $treatment->id)
                ->whereYear('month', $nextMonth->year)
                ->whereMonth('month', $nextMonth->month)
                ->exists();

            if (!$exists) {
                MonthlyDispensingRecord::create([
                    'monthly_treatment_id' => $treatment->id,
                    'month'                => $nextMonth->toDateString(),
                    'status'               => DispensingMonth::Pending,
                ]);
            }
        }

        return $record->fresh();
    }

    /**
     * Ensure all active treatments have a pending dispensing record for the current month.
     * Called by the Artisan command.
     *
     * @return int Number of records created
     */
    public function generateMonthlyRecords(): int
    {
        $currentMonth = Carbon::now()->startOfMonth()->toDateString();
        $created = 0;

        MonthlyTreatment::where('status', MonthlyTreatmentStatus::Active)
            ->each(function (MonthlyTreatment $treatment) use ($currentMonth, &$created) {
                $exists = MonthlyDispensingRecord::where('monthly_treatment_id', $treatment->id)
                    ->where('month', $currentMonth)
                    ->exists();

                if (!$exists) {
                    MonthlyDispensingRecord::create([
                        'monthly_treatment_id' => $treatment->id,
                        'month'                => $currentMonth,
                        'status'               => DispensingMonth::Pending,
                    ]);
                    $created++;
                }
            });

        return $created;
    }
}

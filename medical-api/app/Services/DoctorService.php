<?php

namespace App\Services;

use App\Enums\CheckupStatus;
use App\Enums\ReferralStatus;
use App\Events\DiagnosisCompleted;
use App\Events\ExternalReferralCreated;
use App\Models\CheckupRequest;
use App\Models\Diagnosis;
use App\Models\ExternalReferral;
use App\Models\Medicine;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\SickLeave;
use Illuminate\Support\Facades\DB;

class DoctorService
{
    public function writeDiagnosis(CheckupRequest $request, int $doctorId, string $diagnosisText): Diagnosis
    {
        if ($request->status !== CheckupStatus::CheckedOut) {
            throw new \Exception('المريض غير في قائمة الانتظار');
        }

        return DB::transaction(function () use ($request, $doctorId, $diagnosisText) {
            $diagnosis = Diagnosis::create([
                'checkup_request_id' => $request->id,
                'doctor_id'          => $doctorId,
                'diagnosis_text'     => $diagnosisText,
            ]);

            $request->update(['status' => CheckupStatus::InDiagnosis]);

            DiagnosisCompleted::dispatch($request);

            return $diagnosis;
        });
    }

    public function writePrescription(CheckupRequest $request, int $doctorId, array $items, ?string $notes): Prescription
    {
        if (
            $request->status !== CheckupStatus::InDiagnosis &&
            $request->status !== CheckupStatus::CheckedOut
        ) {
            throw new \Exception('لا يمكن كتابة وصفة طبية في هذه المرحلة');
        }

        return DB::transaction(function () use ($request, $doctorId, $items, $notes) {
            $prescription = Prescription::create([
                'checkup_request_id' => $request->id,
                'notes'              => $notes,
            ]);

            foreach ($items as $item) {
                $isAvailable = true;

                if (!empty($item['medicine_id'])) {
                    $medicine    = Medicine::find($item['medicine_id']);
                    $isAvailable = $medicine ? $medicine->current_stock > 0 : false;
                }

                PrescriptionItem::create([
                    'prescription_id' => $prescription->id,
                    'medicine_id'     => $item['medicine_id'] ?? null,
                    'medicine_name'   => $item['medicine_name'],
                    'dosage'          => $item['dosage'],
                    'duration'        => $item['duration'],
                    'is_available'    => $item['is_available'] ?? $isAvailable,
                ]);
            }

            $request->update(['status' => CheckupStatus::Prescribed]);

            return $prescription->load('items');
        });
    }

    public function writeExternalReferral(CheckupRequest $request, int $doctorId, array $data): ExternalReferral
    {
        $referral = ExternalReferral::create([
            'checkup_request_id'  => $request->id,
            'external_provider_id' => $data['external_provider_id'],
            'specialty'           => $data['specialty'],
            'reason'              => $data['reason'],
            'notes'               => $data['notes'] ?? null,
            'status'              => ReferralStatus::PendingApproval,
        ]);

        ExternalReferralCreated::dispatch($referral);

        return $referral;
    }

    public function writeSickLeave(CheckupRequest $request, array $data): SickLeave
    {
        return SickLeave::create([
            'checkup_request_id' => $request->id,
            'days_count'         => $data['days_count'],
            'reason'             => $data['reason'],
            'start_date'         => $data['start_date'],
        ]);
    }
}

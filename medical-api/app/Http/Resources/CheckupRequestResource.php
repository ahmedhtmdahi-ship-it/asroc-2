<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CheckupRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type?->value,
            'status' => $this->status?->value,
            'notes' => $this->notes,
            'approved_at' => $this->approved_at,
            'rejection_reason' => $this->rejection_reason,
            'postponed_until' => $this->postponed_until,
            'checked_out_at' => $this->checked_out_at,
            'returned_at' => $this->returned_at,
            'created_at' => $this->created_at,
            'employee' => $this->whenLoaded('employee', function () {
                return $this->employee ? [
                    'id' => $this->employee->id,
                    'name' => $this->employee->user?->name,
                ] : null;
            }),
            'department' => $this->whenLoaded('department', function () {
                return $this->department ? [
                    'id' => $this->department->id,
                    'name' => $this->department->name,
                ] : null;
            }),
            'created_by' => $this->whenLoaded('createdBy', function () {
                return $this->createdBy ? [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                ] : null;
            }),
            'approved_by' => $this->whenLoaded('approvedBy', function () {
                return $this->approvedBy ? [
                    'id' => $this->approvedBy->id,
                    'name' => $this->approvedBy->name,
                ] : null;
            }),
            'security_officer' => $this->whenLoaded('securityOfficer', function () {
                return $this->securityOfficer ? [
                    'id' => $this->securityOfficer->id,
                    'name' => $this->securityOfficer->name,
                ] : null;
            }),
            'diagnosis' => $this->whenLoaded('diagnosis', function () {
                return $this->diagnosis ? new DiagnosisResource($this->diagnosis) : null;
            }),
            'prescription' => $this->whenLoaded('prescription', function () {
                return $this->prescription ? new PrescriptionResource($this->prescription) : null;
            }),
            'sick_leave' => $this->whenLoaded('sickLeave', function () {
                return $this->sickLeave ? new SickLeaveResource($this->sickLeave) : null;
            }),
            'external_referral' => $this->whenLoaded('externalReferral', function () {
                return $this->externalReferral ? new ExternalReferralResource($this->externalReferral) : null;
            }),
        ];
    }
}

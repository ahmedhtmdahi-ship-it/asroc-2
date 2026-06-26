<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CheckupRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $dept = $this->relationLoaded('department') ? $this->department : null;
        $emp  = $this->relationLoaded('employee')   ? $this->employee   : null;
        $empDept = $emp?->relationLoaded('department') ? $emp->department : null;

        return [
            'id'               => $this->id,
            'type'             => $this->type?->value,
            'status'           => $this->status?->value,
            'notes'            => $this->notes,
            'target_clinic'    => $this->target_clinic,
            'approved_at'      => $this->approved_at,
            'rejection_reason' => $this->rejection_reason,
            'postponed_until'  => $this->postponed_until,
            'checked_out_at'   => $this->checked_out_at,
            'returned_at'      => $this->returned_at,
            'created_at'       => $this->created_at,

            // Flat fields for easy frontend mapping
            'employee_name'    => $emp?->user?->name,
            'financial_number' => $emp?->financial_number,
            'department_name'  => $dept?->name ?? $empDept?->name,
            'job_title'        => $emp?->job_title,

            'employee' => $this->whenLoaded('employee', function () {
                return $this->employee ? [
                    'id'               => $this->employee->id,
                    'name'             => $this->employee->user?->name,
                    'financial_number' => $this->employee->financial_number,
                    'job_title'        => $this->employee->job_title,
                ] : null;
            }),
            'department' => $this->whenLoaded('department', function () {
                return $this->department ? [
                    'id'   => $this->department->id,
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

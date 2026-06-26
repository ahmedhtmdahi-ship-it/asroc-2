<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MonthlyTreatmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'beneficiary_type' => $this->beneficiary_type,
            'disease_name' => $this->disease_name,
            'status' => $this->status?->value,
            'review_type' => $this->review_type?->value,
            'last_reviewed_at' => $this->last_reviewed_at,
            'notes' => $this->notes,
            'employee' => $this->whenLoaded('employee', function () {
                return $this->employee ? [
                    'id' => $this->employee->id,
                    'name' => $this->employee->user?->name,
                ] : null;
            }),
            'doctor' => $this->whenLoaded('doctor', function () {
                return $this->doctor ? [
                    'id' => $this->doctor->id,
                    'name' => $this->doctor->name,
                ] : null;
            }),
            'medications' => $this->whenLoaded('medications', function () {
                return $this->medications->map(fn ($med) => [
                    'medicine_name' => $med->medicine_name,
                    'dosage' => $med->dosage,
                ])->toArray();
            }),
            'created_at' => $this->created_at,
        ];
    }
}

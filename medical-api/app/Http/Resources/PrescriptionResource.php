<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrescriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $cr  = $this->relationLoaded('checkupRequest') ? $this->checkupRequest : null;
        $emp = $cr?->relationLoaded('employee')         ? $cr->employee        : null;
        $dept = $cr?->relationLoaded('department')      ? $cr->department      : ($emp?->relationLoaded('department') ? $emp->department : null);

        return [
            'id'          => $this->id,
            'notes'       => $this->notes,
            'dispensed_at' => $this->dispensed_at,
            'dispensed_by' => $this->whenLoaded('dispensedBy', fn () => $this->dispensedBy
                ? ['id' => $this->dispensedBy->id, 'name' => $this->dispensedBy->name]
                : null),
            'items'       => PrescriptionItemResource::collection($this->whenLoaded('items')),
            'created_at'  => $this->created_at,

            // Embedded checkup request fields for WorkflowContext mapping
            'checkup_request_id' => $cr?->id,
            'status'             => $cr?->status?->value,
            'type'               => $cr?->type?->value,
            'employee_name'      => $emp?->user?->name,
            'financial_number'   => $emp?->financial_number,
            'department_name'    => $dept?->name,
            'job_title'          => $emp?->job_title,
            'checkup_created_at' => $cr?->created_at,
        ];
    }
}

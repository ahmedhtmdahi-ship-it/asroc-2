<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'financial_number' => $this->financial_number,
            'national_id' => $this->national_id,
            'job_title' => $this->job_title,
            'type' => $this->type?->value,
            'phone' => $this->phone,
            'checkups_used_this_month' => $this->checkups_used_this_month,
            'checkup_month_reset' => $this->checkup_month_reset,
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ];
            }),
            'department' => $this->whenLoaded('department', function () {
                return $this->department ? [
                    'id' => $this->department->id,
                    'name' => $this->department->name,
                ] : null;
            }),
            'created_at' => $this->created_at,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $emp = $this->relationLoaded('employee') ? $this->employee : null;
        $dept = $emp?->relationLoaded('department') ? $emp->department : null;

        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'email'            => $this->email,
            'is_active'        => $this->is_active,
            'last_login_at'    => $this->last_login_at,
            'roles'            => $this->getRoleNames()->toArray(),
            'role'             => $this->getRoleNames()->first(),
            'permissions'      => $this->getAllPermissions()->pluck('name')->toArray(),
            'financial_number' => $emp?->financial_number,
            'job_title'        => $emp?->job_title,
            'department'       => $dept?->name ?? null,
            'work_type'        => $emp?->type?->value,
            'work_shift'       => $emp?->work_shift ?? 'day',
            'clinic'           => $emp?->clinic,
        ];
    }
}

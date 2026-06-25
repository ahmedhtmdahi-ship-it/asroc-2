<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FamilyMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'national_id' => $this->national_id,
            'relation' => $this->relation?->value,
            'birth_date' => $this->birth_date,
            'is_active' => $this->is_active,
            'age' => $this->birth_date ? $this->birth_date->age : null,
            'employee_id' => $this->employee_id,
        ];
    }
}

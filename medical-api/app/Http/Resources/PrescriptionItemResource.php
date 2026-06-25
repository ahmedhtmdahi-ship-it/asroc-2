<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrescriptionItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'medicine_id' => $this->medicine_id,
            'medicine_name' => $this->medicine_name,
            'dosage' => $this->dosage,
            'duration' => $this->duration,
            'is_available' => $this->is_available,
        ];
    }
}

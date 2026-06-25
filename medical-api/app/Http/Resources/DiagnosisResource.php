<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiagnosisResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'diagnosis_text' => $this->diagnosis_text,
            'doctor' => $this->whenLoaded('doctor', function () {
                return $this->doctor ? [
                    'id' => $this->doctor->id,
                    'name' => $this->doctor->name,
                ] : null;
            }),
            'created_at' => $this->created_at,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrescriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'notes' => $this->notes,
            'dispensed_at' => $this->dispensed_at,
            'dispensed_by' => $this->whenLoaded('dispensedBy', function () {
                return $this->dispensedBy ? [
                    'id' => $this->dispensedBy->id,
                    'name' => $this->dispensedBy->name,
                ] : null;
            }),
            'items' => PrescriptionItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
        ];
    }
}

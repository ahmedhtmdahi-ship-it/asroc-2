<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MedicineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'active_ingredient' => $this->active_ingredient,
            'category' => $this->category,
            'current_stock' => $this->current_stock,
            'minimum_stock' => $this->minimum_stock,
            'unit' => $this->unit,
            'is_low_stock' => $this->current_stock <= $this->minimum_stock,
            'created_at' => $this->created_at,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MedicineBatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                       => $this->id,
            'medicine_id'              => $this->medicine_id,
            'medicine_name'            => $this->medicine?->name,
            'supplier'                 => $this->supplier ? [
                'id'   => $this->supplier->id,
                'name' => $this->supplier->name,
            ] : null,
            'batch_number'             => $this->batch_number,
            'expiry_date'              => $this->expiry_date?->toDateString(),
            'quantity_received'        => $this->quantity_received,
            'quantity_remaining'       => $this->quantity_remaining,
            'purchase_price_per_unit'  => $this->purchase_price_per_unit,
            'received_at'              => $this->received_at?->toDateString(),
            'is_expired'               => $this->isExpired(),
            'is_expiring_soon'         => $this->isExpiringSoon(30),
            'notes'                    => $this->notes,
            'created_at'               => $this->created_at,
        ];
    }
}

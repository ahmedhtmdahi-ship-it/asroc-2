<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SickLeaveResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'days_count' => $this->days_count,
            'reason' => $this->reason,
            'start_date' => $this->start_date,
            'created_at' => $this->created_at,
        ];
    }
}

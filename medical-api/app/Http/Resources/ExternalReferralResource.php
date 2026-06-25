<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ExternalReferralResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'specialty' => $this->specialty,
            'reason' => $this->reason,
            'notes' => $this->notes,
            'status' => $this->status?->value,
            'reviewed_at' => $this->reviewed_at,
            'rejection_reason' => $this->rejection_reason,
            'pdf_url' => $this->pdf_path ? Storage::url($this->pdf_path) : null,
            'external_provider' => $this->whenLoaded('externalProvider', function () {
                return $this->externalProvider ? [
                    'id' => $this->externalProvider->id,
                    'name' => $this->externalProvider->name,
                    'type' => $this->externalProvider->type?->value,
                    'specialty' => $this->externalProvider->specialty,
                    'address' => $this->externalProvider->address,
                    'phone' => $this->externalProvider->phone,
                ] : null;
            }),
            'reviewed_by' => $this->whenLoaded('reviewedBy', function () {
                return $this->reviewedBy ? [
                    'id' => $this->reviewedBy->id,
                    'name' => $this->reviewedBy->name,
                ] : null;
            }),
            'created_at' => $this->created_at,
        ];
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Resources\PrescriptionResource;
use App\Models\CheckupRequest;
use App\Services\DoctorService;
use Illuminate\Http\Request;

class PrescriptionController extends Controller
{
    public function __construct(private DoctorService $doctorService) {}

    public function store(Request $request, $id)
    {
        $validated = $request->validate([
            'notes'                   => ['nullable', 'string'],
            'items'                   => ['required', 'array', 'min:1'],
            'items.*.medicine_id'     => ['nullable', 'exists:medicines,id'],
            'items.*.medicine_name'   => ['required', 'string'],
            'items.*.dosage'          => ['required', 'string'],
            'items.*.duration'        => ['required', 'string'],
        ]);

        $checkupRequest = CheckupRequest::findOrFail($id);

        $prescription = $this->doctorService->writePrescription(
            $checkupRequest,
            $request->user()->id,
            $validated['items'],
            $validated['notes'] ?? null
        );

        return (new PrescriptionResource($prescription))
            ->response()
            ->setStatusCode(201);
    }
}

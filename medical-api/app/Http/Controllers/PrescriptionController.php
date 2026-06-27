<?php

namespace App\Http\Controllers;

use App\Http\Resources\CheckupRequestResource;
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
            'items'                   => ['required', 'array', 'min:1', 'max:8'],
            'items.*.medicine_id'     => ['required', 'integer', 'exists:medicines,id'],
            'items.*.medicine_name'   => ['required', 'string'],
            'items.*.dosage'          => ['required', 'string'],
            'items.*.duration'        => ['required', 'string'],
        ]);

        $checkupRequest = CheckupRequest::findOrFail($id);

        $this->doctorService->writePrescription(
            $checkupRequest,
            $request->user()->id,
            $validated['items'],
            $validated['notes'] ?? null
        );

        $checkupRequest->refresh()->load(['employee.user', 'department', 'createdBy', 'approvedBy', 'prescription.items']);

        return (new CheckupRequestResource($checkupRequest))
            ->response()
            ->setStatusCode(201);
    }
}

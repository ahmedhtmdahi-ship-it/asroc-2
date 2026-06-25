<?php

namespace App\Http\Controllers;

use App\Http\Resources\DiagnosisResource;
use App\Models\CheckupRequest;
use App\Services\DoctorService;
use Illuminate\Http\Request;

class DiagnosisController extends Controller
{
    public function __construct(private DoctorService $doctorService) {}

    public function store(Request $request, $id)
    {
        $validated = $request->validate([
            'diagnosis_text' => ['required', 'string', 'min:10'],
        ]);

        $checkupRequest = CheckupRequest::findOrFail($id);

        $diagnosis = $this->doctorService->writeDiagnosis(
            $checkupRequest,
            $request->user()->id,
            $validated['diagnosis_text']
        );

        return (new DiagnosisResource($diagnosis))
            ->response()
            ->setStatusCode(201);
    }
}

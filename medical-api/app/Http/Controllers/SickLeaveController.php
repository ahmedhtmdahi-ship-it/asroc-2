<?php

namespace App\Http\Controllers;

use App\Http\Resources\SickLeaveResource;
use App\Models\CheckupRequest;
use App\Services\DoctorService;
use Illuminate\Http\Request;

class SickLeaveController extends Controller
{
    public function __construct(private DoctorService $doctorService) {}

    public function store(Request $request, $id)
    {
        $validated = $request->validate([
            'days_count' => ['required', 'integer', 'min:1', 'max:30'],
            'reason'     => ['required', 'string'],
            'start_date' => ['required', 'date'],
        ]);

        $checkupRequest = CheckupRequest::findOrFail($id);

        $sickLeave = $this->doctorService->writeSickLeave($checkupRequest, $validated);

        return (new SickLeaveResource($sickLeave))
            ->response()
            ->setStatusCode(201);
    }
}

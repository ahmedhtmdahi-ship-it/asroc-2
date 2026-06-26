<?php

namespace App\Http\Controllers;

use App\Enums\CheckupStatus;
use App\Http\Resources\CheckupRequestResource;
use App\Models\CheckupRequest;
use Illuminate\Http\Request;

class DoctorController extends Controller
{
    public function queue(Request $request)
    {
        $doctorEmployee = $request->user()->employee;
        $doctorClinic   = $doctorEmployee?->clinic;

        $query = CheckupRequest::with(['employee.user', 'employee.department'])
            ->where('status', CheckupStatus::CheckedOut);

        // If the doctor has a clinic assignment, only show their clinic's queue
        if ($doctorClinic) {
            $query->where('target_clinic', $doctorClinic);
        }

        $requests = $query->latest()->paginate(50);

        return CheckupRequestResource::collection($requests);
    }

    public function show($id)
    {
        $checkupRequest = CheckupRequest::with([
            'employee.user',
            'employee.department',
            'diagnosis',
            'prescription.items.medicine',
            'externalReferral.externalProvider',
            'sickLeave',
            'approvedBy',
            'securityOfficer',
        ])->findOrFail($id);

        return new CheckupRequestResource($checkupRequest);
    }
}

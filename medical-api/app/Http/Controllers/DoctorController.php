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
        $requests = CheckupRequest::with(['employee.user', 'employee.department'])
            ->where('status', CheckupStatus::CheckedOut)
            ->latest()
            ->paginate(10);

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

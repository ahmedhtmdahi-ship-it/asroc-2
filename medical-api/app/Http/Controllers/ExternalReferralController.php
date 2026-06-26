<?php

namespace App\Http\Controllers;

use App\Enums\ReferralStatus;
use App\Events\ReferralApproved;
use App\Events\ReferralRejected;
use App\Http\Resources\ExternalReferralResource;
use App\Models\CheckupRequest;
use App\Models\ExternalReferral;
use App\Services\DoctorService;
use App\Services\PdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExternalReferralController extends Controller
{
    public function __construct(
        private DoctorService $doctorService,
        private PdfService $pdfService
    ) {}

    public function store(Request $request, $id)
    {
        $validated = $request->validate([
            'external_provider_id' => ['required', 'exists:external_providers,id'],
            'specialty'            => ['required', 'string'],
            'reason'               => ['required', 'string'],
            'notes'                => ['nullable', 'string'],
        ]);

        $checkupRequest = CheckupRequest::findOrFail($id);

        $referral = $this->doctorService->writeExternalReferral(
            $checkupRequest,
            $request->user()->id,
            $validated
        );

        return (new ExternalReferralResource($referral))
            ->response()
            ->setStatusCode(201);
    }

    public function approve(Request $request, $id)
    {
        $referral = ExternalReferral::findOrFail($id);

        abort_if(
            $referral->status !== ReferralStatus::PendingApproval,
            422,
            'الإحالة ليست في حالة انتظار الموافقة'
        );

        $referral->update([
            'status'      => ReferralStatus::Approved,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $this->pdfService->generateReferralPdf($referral);

        ReferralApproved::dispatch($referral);

        return new ExternalReferralResource($referral->fresh());
    }

    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string'],
        ]);

        $referral = ExternalReferral::findOrFail($id);

        $referral->update([
            'status'           => ReferralStatus::Rejected,
            'rejection_reason' => $validated['rejection_reason'],
            'reviewed_by'      => $request->user()->id,
            'reviewed_at'      => now(),
        ]);

        ReferralRejected::dispatch($referral);

        return new ExternalReferralResource($referral->fresh());
    }

    public function downloadPdf($id)
    {
        $referral = ExternalReferral::findOrFail($id);

        abort_if(
            empty($referral->pdf_path),
            404,
            'ملف PDF غير موجود لهذه الإحالة'
        );

        return Storage::download($referral->pdf_path, 'referral_' . $id . '.pdf');
    }

    public function pending()
    {
        $referrals = ExternalReferral::with([
            'checkupRequest.employee.user',
            'checkupRequest.employee.department',
            'externalProvider',
        ])
            ->latest()
            ->paginate(50);

        return ExternalReferralResource::collection($referrals);
    }
}

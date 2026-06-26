<?php

namespace App\Jobs;

use App\Models\ExternalReferral;
use App\Services\PdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateReferralPdf implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $referralId) {}

    public function handle(PdfService $pdfService): void
    {
        $referral = ExternalReferral::with(['checkupRequest.employee.user', 'externalProvider'])->find($this->referralId);
        if ($referral && !$referral->pdf_path) {
            $pdfService->generateReferralPdf($referral);
        }
    }
}

<?php

namespace App\Services;

use App\Models\ExternalReferral;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class PdfService
{
    public function generateReferralPdf(ExternalReferral $referral): string
    {
        $referral->load([
            'checkupRequest.employee.user',
            'checkupRequest.employee.department',
            'externalProvider',
            'reviewedBy',
        ]);

        $employee         = $referral->checkupRequest->employee;
        $user             = $employee->user ?? null;
        $department       = $employee->department ?? null;
        $externalProvider = $referral->externalProvider;
        $reviewedBy       = $referral->reviewedBy;

        $patientName      = $user ? $user->name : 'غير محدد';
        $nationalId       = $employee->national_id ?? 'غير محدد';
        $departmentName   = $department ? $department->name : 'غير محدد';
        $providerName     = $externalProvider ? $externalProvider->name : 'غير محدد';
        $providerAddress  = $externalProvider ? ($externalProvider->address ?? '') : '';
        $approvedByName   = $reviewedBy ? $reviewedBy->name : 'غير محدد';
        $reviewedAt       = $referral->reviewed_at ? $referral->reviewed_at->format('Y-m-d H:i') : '';
        $createdAt        = $referral->created_at ? $referral->created_at->format('Y-m-d') : '';

        $html = '<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, Arial, sans-serif; direction: rtl; font-size: 13px; color: #222; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
        h2 { text-align: center; font-size: 14px; color: #555; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        td { padding: 7px 10px; border: 1px solid #ccc; }
        .label { background: #f5f5f5; font-weight: bold; width: 35%; }
        .section-title { background: #1a3a5c; color: #fff; font-weight: bold; text-align: center; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #888; }
    </style>
</head>
<body>
    <h1>إحالة خارجية</h1>
    <h2>نظام الإدارة الطبية</h2>

    <table>
        <tr><td class="section-title" colspan="2">بيانات المريض</td></tr>
        <tr><td class="label">اسم المريض</td><td>' . htmlspecialchars($patientName) . '</td></tr>
        <tr><td class="label">الرقم الوطني</td><td>' . htmlspecialchars($nationalId) . '</td></tr>
        <tr><td class="label">القسم</td><td>' . htmlspecialchars($departmentName) . '</td></tr>
    </table>

    <table>
        <tr><td class="section-title" colspan="2">تفاصيل الإحالة</td></tr>
        <tr><td class="label">التخصص المطلوب</td><td>' . htmlspecialchars($referral->specialty) . '</td></tr>
        <tr><td class="label">سبب الإحالة</td><td>' . htmlspecialchars($referral->reason) . '</td></tr>
        <tr><td class="label">ملاحظات</td><td>' . htmlspecialchars($referral->notes ?? '') . '</td></tr>
        <tr><td class="label">تاريخ الإحالة</td><td>' . htmlspecialchars($createdAt) . '</td></tr>
    </table>

    <table>
        <tr><td class="section-title" colspan="2">الجهة الخارجية</td></tr>
        <tr><td class="label">اسم الجهة</td><td>' . htmlspecialchars($providerName) . '</td></tr>
        <tr><td class="label">العنوان</td><td>' . htmlspecialchars($providerAddress) . '</td></tr>
    </table>

    <table>
        <tr><td class="section-title" colspan="2">معلومات الاعتماد</td></tr>
        <tr><td class="label">معتمد من</td><td>' . htmlspecialchars($approvedByName) . '</td></tr>
        <tr><td class="label">تاريخ الاعتماد</td><td>' . htmlspecialchars($reviewedAt) . '</td></tr>
        <tr><td class="label">الحالة</td><td>معتمدة</td></tr>
    </table>

    <div class="footer">تم إنشاء هذا المستند تلقائياً من نظام الإدارة الطبية</div>
</body>
</html>';

        $pdfContent = Pdf::loadHTML($html)->output();

        $pdfPath = 'referrals/referral_' . $referral->id . '.pdf';

        Storage::put($pdfPath, $pdfContent);

        $referral->pdf_path = $pdfPath;
        $referral->save();

        return $pdfPath;
    }
}

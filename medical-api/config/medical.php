<?php

return [
    /*
     * عدد الكشوف المسموح بها شهريًا للموظف
     */
    'monthly_checkup_limit' => env('MONTHLY_CHECKUP_LIMIT', 3),

    /*
     * الحد الأقصى لسن الابن المستفيد من الرعاية الصحية
     */
    'son_age_limit' => env('SON_AGE_LIMIT', 26),

    /*
     * مسار حفظ ملفات PDF التحويلات الطبية
     */
    'referral_pdf_path' => 'referrals',

    /*
     * ساعات الغياب المسموح بها قبل اعتبار الموظف متأخرًا
     */
    'late_threshold_hours' => env('LATE_THRESHOLD_HOURS', 3),
];

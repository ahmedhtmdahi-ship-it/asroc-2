# TODO - B9 اختبارات e2e حقيقية

- [x] تحليل ملفات e2e الأساسية: 04 / 05 / 16
- [x] إضافة `data-testid` للعناصر الحرجة في الـ UI:
  - [x] حقول/زر إنشاء الطلب + نوع الكشف في `CreateMedicalRequestPage.tsx`
  - [x] صف/حالة/رقم الطلب في `MyMedicalRequestsPage.tsx`
  - [x] صف الطلب + موافقة/رفض + تأكيد القرار في `ManagerApprovalsPage.tsx`
  - [x] صفحات workflow: `SecurityCheckInOutPage` (خروج/عودة)، `DoctorPage` (بدء الكشف)،
        `DoctorDiagnosisPage` (تشخيص/دواء/حفظ)، `PharmacyPage` + `PharmacyDispensePage` (صرف)
- [x] تجميع الـ testids في `e2e/helpers/selectors.ts` (كائن `tid`)
- [x] إعادة كتابة `e2e/04-employee-requests.spec.ts` — assertions حقيقية، بلا `if(isVisible)`/`waitForTimeout`
- [x] إعادة كتابة `e2e/05-manager-approvals.spec.ts` — بذرة طلب عبر الـ API + تأكيد الموافقة/الرفض
- [x] إعادة كتابة `e2e/16-full-workflow.spec.ts` (serial) — بيوصل شارة «مكتمل» بـ testid فعلاً
- [x] حالة نظيفة: `POST /test/reset-workflow` (بيتسجّل في NODE_ENV=test بس) + globalSetup
- [x] تشغيل e2e في CI: job منفصل بيسطّب المتصفح ويشغّل 04/05/16

## ملاحظات
- الاختبارات محتاجة متصفح؛ نسخة Playwright المثبّتة ممكن ما تطابقش build الـ Chromium
  المنزّل محليًا — استخدم `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` محليًا (CI بيستخدم
  `playwright install`).
- الربط بين قسم الاختبار و test-manager بيتظبط في `api/scripts/reset-workflow.mjs`
  (الـ seed بيحط test-manager في قسم حقيقي مربوط بمدير مش موجود في قاعدة الاختبار).

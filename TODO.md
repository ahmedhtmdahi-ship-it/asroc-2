# TODO - B9 اختبارات e2e حقيقية

- [x] تحليل ملفات e2e الأساسية: 04 / 05 / 16 (تمت القراءة)
- [ ] إضافة `data-testid` للعناصر الحرجة في الـ UI:
  - [ ] زر إرسال الطلب + حقول الإنشاء في `CreateMedicalRequestPage.tsx`
  - [ ] جدول/صفوف الطلبات + badges في `MyMedicalRequestsPage.tsx`
  - [ ] أزرار موافقة/رفض/تأجيل + صف/جدول الطلبات في `ManagerApprovalsPage.tsx`
  - [ ] صفحات workflow: `SecurityPage`, `SecurityCheckInOutPage`, `DoctorPage`, `DoctorDiagnosisPage`, `PharmacyPage`, `PharmacyDispensePage`
  - [ ] رسائل success/toast/alert الخاصة بالـ workflow (testids للنجاح)
- [ ] تحديث `e2e/helpers/selectors.ts` لتجميع testids (بدل الاعتماد على النصوص)
- [ ] إعادة كتابة `e2e/04-employee-requests.spec.ts`:
  - [ ] ممنوع `if (await x.isVisible())`
  - [ ] ممنوع `waitForTimeout`
  - [ ] assertions أثر ملموس بعد الإرسال (toast/انتقال/صف الحالة)
- [ ] إعادة كتابة `e2e/05-manager-approvals.spec.ts` بنفس القواعد + assertions بعد كل قرار
- [ ] إعادة كتابة `e2e/16-full-workflow.spec.ts` (serial):
  - [ ] assertions أثر ملموس بعد كل step
  - [ ] إزالة كل waitForTimeout + كل if isVisible
  - [ ] التحقق النهائي عبر badge/صف “مكتمل” بـ testid
- [ ] التأكد من استخدام حسابات test-* فقط
- [ ] تشغيل Playwright e2e والتركيز على 04 ثم 05 ثم 16


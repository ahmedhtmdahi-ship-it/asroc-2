# TODO (مراجعة المشروع وإصلاح الـ TypeScript)

- [ ] مراجعة وتشديد المجلدات التي فيها "ريد مي"/عدم تطابق النوع (type mismatches)
- [ ] (من القائمة الموجودة) تعديل tsconfig.json لإضافة ignoreDeprecations: 6.0 (إن لم يكن موجود)
- [ ] (من القائمة الموجودة) التأكد من توافق permissions: Permission[] بدل string[]
- [ ] تعديل/توحيد mockManagers وإصلاح أي تعريفات ناقصة للـ status
- [ ] تعديل managersStore.ts لإرجاع status بشكل صحيح ومتوافق مع النوع
- [ ] تعديل medicineStore.ts لإضافة seededMedicines/تصحيح نوع البيانات إن لزم
- [ ] تعديل MedicalAdminPage.tsx لإيقاف أي اعتبار financialNumber ممكن undefined
- [ ] تعديل EmployeeDashboardPage.tsx لإصلاح نوع icon/أي any/implicit any
- [ ] تعديل ManagerApprovalsPage.tsx لحل implicit any index/أي نوع غير مضبوط
- [ ] تشغيل typecheck/build والتأكد من اختفاء أخطاء TS


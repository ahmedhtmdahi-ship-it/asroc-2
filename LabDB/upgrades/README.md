# ترقيات لقاعدة بيانات مبنية بالفعل

الملفات دي **لقاعدة بيانات شغالة فيها بيانات** وعايز تضيف عليها التحسينات من غير ما تعيد البناء من الصفر.

> لو بتعمل تركيب جديد، **متستخدمش المجلد ده** — ملفات `src/` بقى فيها كل التحسينات دي مدمجة.

---

## U1_Fixes — إصلاحات أول تجربة

**بتصلح إيه:**
- القيمة الافتراضية لـ `Orders.Status` كانت بتتخزن `'Registered'` بعلامات تنصيص (وده بيكسر فلترة شاشة النتائج) — بتتصحح، والصفوف القديمة بتتصلح كمان
- توسيع خانتي Order Date و Status في شاشة الطلب (كانوا بيظهروا `####`)
- تسميات أعمدة الجداول الفرعية بالإنجليزي بدل أسماء الكونترولات
- حذف تقارير Report1/2/3 المتخلفة من محاولات بناء فاشلة

**التشغيل:** الصقه في موديول جديد، وفي نافذة Immediate اكتب `FixAll` واضغط Enter.

---

## U2_ReportLayout — شكل التقرير المطابق للمعمل

**بيعمل إيه:**
- بيضيف حقول جديدة: `Orders.Patient_No`, `Orders.Lab_Code`, `Orders.Reporting_Date`, `Orders.Comments`, `Tests.Test_Method`
- بيعيد بناء `qryResult` و `rptResult` بالشكل ده:
  - هيدر: Patient No. / Lab Code / Name / Referred By + Req. Date / Sex / Age / Reporting Date
  - عنوان حسب التصنيف: `<Category> Report`
  - أعمدة: Test | Result | Unit | Ref.Range
  - علامة `H` / `L` جنب النتيجة الشاذة
  - فوتر: Test method، Comments، Branch Manager

**مطلوب معاه تعديل يدوي في `basLab`:** دالة `ResultStatus` لازم ترجع `L` / `H` / `N` بدل `Low` / `High` / `Normal`:

```vba
    If n < CDbl(vMin) Then
        ResultStatus = "L"
    ElseIf n > CDbl(vMax) Then
        ResultStatus = "H"
    Else
        ResultStatus = "N"
    End If
```

**التشغيل:** الصقه في موديول جديد، وفي نافذة Immediate اكتب `UpgradeReport` واضغط Enter.

---

## الترتيب

لو لسه ما شغلتش ولا واحد: شغّل **U1** الأول وبعدين **U2**.

الاتنين آمنين للتكرار — تشغيلهم أكتر من مرة مش بيأذي، والحقول الموجودة بالفعل بتتخطى.

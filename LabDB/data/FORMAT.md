# صيغة ملف استيراد التحاليل

الصف الأول لازم يحتوي عناوين الأعمدة دي **بالظبط** (بنفس الأسماء الإنجليزية):

| العمود | النوع | ملاحظات |
|---|---|---|
| `Test_Name` | نص | **مطلوب** |
| `Test_Code` | نص | اختياري |
| `Category` | نص | **مهم** — بيحدد عنوان التقرير: `Chemistry` / `Hematology` / `Microbiology` / `Hormones` |
| `Unit` | نص | mg/dL, g/dL, ng/ml ... |
| `Normal_Range_Min` | رقم | **أرقام فقط**. سيبه فاضي لو المدى غير رقمي |
| `Normal_Range_Max` | رقم | **أرقام فقط** |
| `Normal_Range_Text` | نص | للنتائج النصية زي `Negative` — سيبه فاضي لو المدى رقمي |
| `Normal_Range_Notes` | نص | لو المدى بيختلف حسب العمر/الجنس |
| `Price` | رقم | **مطلوب** |
| `Sample_Type` | نص | Serum / EDTA whole blood / Urine ... (لحد 150 حرف) |
| `Is_Active` | TRUE/FALSE | سيبه `TRUE` |
| `Test_Method` | نص | زي `CLIA/e CLIA` — بيتطبع أسفل التقرير |

---

## قواعد مهمة

- **ما تحطش عمود `Test_ID`** — بيتولد تلقائيًا.
- الخانات الرقمية (`Normal_Range_Min/Max`, `Price`) لازم تكون **أرقام فقط**. لو كتبت فيها `70-110` الاستيراد هيفشل — المدى الرقمي بيتقسم على عمودين، والمدى النصي بيروح لـ `Normal_Range_Text`.
- **`Category` مهم** لأن عنوان التقرير بيتبني منه. لو سبته فاضي هيطلع "Lab Report".
- **`Normal_Range_Min/Max` مهمين** لأن علامة H/L بتتحدد منهم تلقائيًا. التحليل اللي مالوش مدى رقمي هتكتب حالته بإيدك.

---

## مثال

| Test_Name | Category | Unit | Normal_Range_Min | Normal_Range_Max | Normal_Range_Text | Price | Sample_Type | Is_Active |
|---|---|---|---|---|---|---|---|---|
| Ferritin | Chemistry | ng/ml | 15 | 150 | | 200 | Serum | TRUE |
| Hemoglobin | Hematology | g/dL | 12 | 16 | | 40 | EDTA whole blood | TRUE |
| Pregnancy Test | Hormones | | | | Negative | 60 | Urine | TRUE |

خطوات الاستيراد نفسها في `دليل_استيراد_التحاليل_من_Excel.md`.

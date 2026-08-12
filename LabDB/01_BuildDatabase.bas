Option Compare Database
Option Explicit

' ============================================================================
'  معمل التحاليل - المرحلة 1 : إنشاء الجداول والعلاقات والبيانات التجريبية
' ----------------------------------------------------------------------------
'  ما الذي يفعله هذا الكود؟
'   - ينشئ الجداول الخمسة: Patients, Tests, Orders, Order_Details, tblSettings
'   - يضبط المفاتيح الأساسية (Primary Keys) والحقول المطلوبة والقيم الافتراضية
'   - ينشئ العلاقات بينها مع فرض التكامل المرجعي (Referential Integrity)
'   - يضيف 3 تحاليل تجريبية + صف الإعدادات
'
'  طريقة التشغيل (مرة واحدة فقط):
'   1) افتح قاعدة بيانات Access فارغة جديدة (Blank Database) واحفظها باسم LabDB.accdb
'   2) اضغط Alt + F11 لفتح محرر الأكواد (VBA)
'   3) من القائمة: Insert > Module
'   4) الصق كل محتوى هذا الملف بالكامل
'   5) ضع المؤشر داخل الإجراء BuildDatabase ثم اضغط F5 (أو زر التشغيل الأخضر)
'   6) ستظهر رسالة "تم بنجاح" — أغلق المحرر وافتح شريط الجداول لتراها
'
'  ملاحظة: يمكنك تشغيله أكثر من مرة بأمان — سيحذف الجداول القديمة ويعيد بناءها.
'          (تحذير: إعادة التشغيل تمسح أي بيانات أدخلتها، فلا تشغّله بعد بدء العمل الفعلي)
' ============================================================================

Public Sub BuildDatabase()
    On Error GoTo Fail
    Dim db As DAO.Database
    Set db = CurrentDb

    ' حذف أي جداول/علاقات سابقة حتى يمكن إعادة التشغيل بأمان
    CleanUp db

    ' إنشاء الجداول
    CreatePatients db
    CreateTests db
    CreateOrders db
    CreateOrderDetails db
    CreateSettings db

    ' تحديث القوائم الداخلية قبل إنشاء العلاقات
    db.TableDefs.Refresh

    ' إنشاء العلاقات
    CreateRelationships db

    ' إدخال بيانات تجريبية
    InsertSampleData db

    MsgBox "تم إنشاء كل الجداول والعلاقات والبيانات التجريبية بنجاح." & vbCrLf & _
           "أغلق هذا المحرر وافتح الجداول لتتأكد.", vbInformation, "تم بنجاح"
    Exit Sub
Fail:
    MsgBox "حدث خطأ رقم " & Err.Number & vbCrLf & Err.Description, vbCritical, "خطأ"
End Sub


' ---------------------------------------------------------------------------
'  دوال مساعدة لإضافة الحقول (لتبسيط الكود وتقليل التكرار)
' ---------------------------------------------------------------------------

' إضافة حقل نصي (Short Text)
Private Sub AddText(td As DAO.TableDef, fname As String, fsize As Integer, _
                    Optional isRequired As Boolean = False, Optional defVal As String = "")
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbText, fsize)
    f.Required = isRequired
    f.AllowZeroLength = True
    If Len(defVal) > 0 Then f.DefaultValue = defVal
    td.Fields.Append f
End Sub

' إضافة حقل رقم صحيح طويل (Long Integer) — يُستخدم للمفاتيح الأجنبية FK
Private Sub AddLong(td As DAO.TableDef, fname As String, Optional isRequired As Boolean = False)
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbLong)
    f.Required = isRequired
    td.Fields.Append f
End Sub

' إضافة حقل عشري مزدوج الدقة (Double)
Private Sub AddDouble(td As DAO.TableDef, fname As String)
    td.Fields.Append td.CreateField(fname, dbDouble)
End Sub

' إضافة حقل عملة (Currency)
Private Sub AddCurrency(td As DAO.TableDef, fname As String, Optional isRequired As Boolean = False)
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbCurrency)
    f.Required = isRequired
    td.Fields.Append f
End Sub

' إضافة حقل تاريخ/وقت (Date/Time)
Private Sub AddDate(td As DAO.TableDef, fname As String, Optional defVal As String = "")
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbDate)
    If Len(defVal) > 0 Then f.DefaultValue = defVal
    td.Fields.Append f
End Sub

' إضافة حقل نعم/لا (Yes/No)
Private Sub AddYesNo(td As DAO.TableDef, fname As String, Optional defaultYes As Boolean = True)
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbBoolean)
    f.DefaultValue = IIf(defaultYes, "-1", "0")   ' -1 = نعم , 0 = لا
    td.Fields.Append f
End Sub

' إنشاء حقل مفتاح أساسي من نوع ترقيم تلقائي (AutoNumber) + جعله المفتاح الأساسي
Private Sub AddAutoPK(td As DAO.TableDef, fname As String)
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbLong)
    f.Attributes = dbAutoIncrField        ' يجعله ترقيمًا تلقائيًا
    td.Fields.Append f

    Dim idx As DAO.Index
    Set idx = td.CreateIndex("PrimaryKey")
    idx.Primary = True
    idx.Unique = True
    idx.Fields.Append idx.CreateField(fname)
    td.Indexes.Append idx
End Sub


' ---------------------------------------------------------------------------
'  إنشاء الجداول
' ---------------------------------------------------------------------------

' جدول المرضى
Private Sub CreatePatients(db As DAO.Database)
    Dim td As DAO.TableDef
    Set td = db.CreateTableDef("Patients")
    AddAutoPK td, "Patient_ID"
    AddText td, "Full_Name", 100, True          ' الاسم مطلوب
    AddText td, "Phone", 20
    AddText td, "Gender", 10                     ' ذكر / أنثى
    AddDate td, "Birth_Date"
    AddLong td, "Age"                            ' يُحسب لاحقًا من تاريخ الميلاد
    AddText td, "Address", 200
    AddText td, "Referring_Doctor", 100          ' الطبيب المحوِّل
    AddDate td, "Created_At", "Now()"
    db.TableDefs.Append td
End Sub

' جدول كتالوج التحاليل
Private Sub CreateTests(db As DAO.Database)
    Dim td As DAO.TableDef
    Set td = db.CreateTableDef("Tests")
    AddAutoPK td, "Test_ID"
    AddText td, "Test_Name", 150, True           ' اسم التحليل مطلوب
    AddText td, "Test_Code", 20
    AddText td, "Category", 50                    ' كيمياء / هرمونات / دم / بول / ميكروبيولوجي
    AddText td, "Unit", 20                        ' الوحدة
    AddDouble td, "Normal_Range_Min"             ' يُترك فارغًا لو المدى غير رقمي
    AddDouble td, "Normal_Range_Max"
    AddText td, "Normal_Range_Text", 100          ' للنتائج النصية مثل Negative
    AddText td, "Normal_Range_Notes", 255         ' لو المدى يختلف حسب العمر/الجنس
    AddCurrency td, "Price", True                 ' السعر مطلوب
    AddText td, "Sample_Type", 30                 ' دم / بول / سيرم / براز
    AddYesNo td, "Is_Active", True               ' نشط افتراضيًا
    db.TableDefs.Append td
End Sub

' جدول طلبات التحاليل
Private Sub CreateOrders(db As DAO.Database)
    Dim td As DAO.TableDef
    Set td = db.CreateTableDef("Orders")
    AddAutoPK td, "Order_ID"
    AddLong td, "Patient_ID", True               ' مفتاح أجنبي للمريض (مطلوب)
    AddDate td, "Order_Date", "Now()"
    AddText td, "Status", 20, False, "'مسجل'"    ' مسجل / جاري / جاهز / مسلّم
    AddCurrency td, "Total_Price"                 ' يُحسب تلقائيًا لاحقًا
    AddCurrency td, "Amount_Paid"
    AddText td, "Notes", 255
    db.TableDefs.Append td

    ' فهرس على المفتاح الأجنبي لتسريع البحث والعلاقات
    AddForeignIndex db, "Orders", "Patient_ID"
End Sub

' جدول تفاصيل الطلب (سطر لكل تحليل داخل الطلب)
Private Sub CreateOrderDetails(db As DAO.Database)
    Dim td As DAO.TableDef
    Set td = db.CreateTableDef("Order_Details")
    AddAutoPK td, "Order_Detail_ID"
    AddLong td, "Order_ID", True                 ' مفتاح أجنبي للطلب
    AddLong td, "Test_ID", True                  ' مفتاح أجنبي للتحليل
    AddCurrency td, "Price_At_Order"             ' نسخة من السعر وقت الطلب
    AddText td, "Result_Value", 100              ' النتيجة (نص يقبل أرقامًا ونصوصًا)
    AddText td, "Result_Status", 20              ' طبيعي/مرتفع/منخفض/غير طبيعي/معلق
    AddDate td, "Result_Date"
    AddText td, "Entered_By", 50
    db.TableDefs.Append td

    AddForeignIndex db, "Order_Details", "Order_ID"
    AddForeignIndex db, "Order_Details", "Test_ID"
End Sub

' جدول الإعدادات (صف واحد فقط: بيانات المعمل)
Private Sub CreateSettings(db As DAO.Database)
    Dim td As DAO.TableDef
    Set td = db.CreateTableDef("tblSettings")
    AddAutoPK td, "Setting_ID"
    AddText td, "Lab_Name", 150
    AddText td, "Lab_Address", 200
    AddText td, "Lab_Phone", 50
    AddText td, "Signatory_Name", 100            ' اسم مسؤول التوقيع
    AddText td, "Logo_Path", 255                 ' مسار صورة اللوجو (اختياري)
    db.TableDefs.Append td
End Sub

' إضافة فهرس عادي على حقل مفتاح أجنبي
Private Sub AddForeignIndex(db As DAO.Database, tableName As String, fieldName As String)
    Dim td As DAO.TableDef
    Set td = db.TableDefs(tableName)
    Dim idx As DAO.Index
    Set idx = td.CreateIndex("idx_" & fieldName)
    idx.Fields.Append idx.CreateField(fieldName)
    td.Indexes.Append idx
End Sub


' ---------------------------------------------------------------------------
'  إنشاء العلاقات (مع فرض التكامل المرجعي)
' ---------------------------------------------------------------------------
Private Sub CreateRelationships(db As DAO.Database)
    ' Patients (1) -> (∞) Orders   بدون حذف متتالٍ
    MakeRelation db, "rel_Patients_Orders", "Patients", "Orders", _
                 "Patient_ID", "Patient_ID", False

    ' Orders (1) -> (∞) Order_Details   مع حذف متتالٍ (Cascade Delete)
    MakeRelation db, "rel_Orders_Details", "Orders", "Order_Details", _
                 "Order_ID", "Order_ID", True

    ' Tests (1) -> (∞) Order_Details   بدون حذف متتالٍ
    MakeRelation db, "rel_Tests_Details", "Tests", "Order_Details", _
                 "Test_ID", "Test_ID", False
End Sub

' دالة إنشاء علاقة واحدة
'  cascadeDelete = True  -> حذف السجل الأب يحذف الأبناء تلقائيًا
Private Sub MakeRelation(db As DAO.Database, relName As String, _
                         parentTbl As String, childTbl As String, _
                         parentField As String, childField As String, _
                         cascadeDelete As Boolean)
    Dim rel As DAO.Relation
    Set rel = db.CreateRelation(relName, parentTbl, childTbl)
    ' Attributes = 0 يعني: التكامل المرجعي مفروض بدون حذف/تحديث متتالٍ
    If cascadeDelete Then
        rel.Attributes = dbRelationDeleteCascade   ' 4096
    Else
        rel.Attributes = 0
    End If
    Dim fld As DAO.Field
    Set fld = rel.CreateField(parentField)
    fld.ForeignName = childField
    rel.Fields.Append fld
    db.Relations.Append rel
End Sub


' ---------------------------------------------------------------------------
'  بيانات تجريبية
' ---------------------------------------------------------------------------
Private Sub InsertSampleData(db As DAO.Database)
    ' 3 تحاليل تجريبية (احذفها لاحقًا من جدول Tests عندما تدخل تحاليلك الحقيقية)
    db.Execute "INSERT INTO Tests (Test_Name, Test_Code, Category, Unit, " & _
        "Normal_Range_Min, Normal_Range_Max, Price, Sample_Type, Is_Active) VALUES " & _
        "('سكر صائم','GLU-F','كيمياء','mg/dL',70,110,50,'دم',True)", dbFailOnError

    db.Execute "INSERT INTO Tests (Test_Name, Test_Code, Category, Unit, " & _
        "Normal_Range_Min, Normal_Range_Max, Price, Sample_Type, Is_Active) VALUES " & _
        "('هيموجلوبين','HGB','دم','g/dL',12,16,40,'دم',True)", dbFailOnError

    db.Execute "INSERT INTO Tests (Test_Name, Test_Code, Category, Unit, " & _
        "Normal_Range_Text, Price, Sample_Type, Is_Active) VALUES " & _
        "('تحليل حمل','HCG-Q','هرمونات','Negative',60,'بول',True)", dbFailOnError

    ' صف الإعدادات (عدّله لاحقًا من جدول tblSettings أو من شاشة الإعدادات)
    db.Execute "INSERT INTO tblSettings (Lab_Name, Lab_Address, Lab_Phone, Signatory_Name) " & _
        "VALUES ('معمل التحاليل الطبية','العنوان هنا','01000000000','د. المسؤول')", dbFailOnError
End Sub


' ---------------------------------------------------------------------------
'  تنظيف: حذف الجداول والعلاقات القديمة (يسمح بإعادة التشغيل بأمان)
' ---------------------------------------------------------------------------
Private Sub CleanUp(db As DAO.Database)
    On Error Resume Next
    db.Relations.Delete "rel_Patients_Orders"
    db.Relations.Delete "rel_Orders_Details"
    db.Relations.Delete "rel_Tests_Details"

    Dim t As Variant
    For Each t In Array("Order_Details", "Orders", "Tests", "Patients", "tblSettings")
        db.TableDefs.Delete CStr(t)
    Next t
    db.TableDefs.Refresh
    On Error GoTo 0
End Sub

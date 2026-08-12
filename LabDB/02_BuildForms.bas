Option Compare Database
Option Explicit

' ============================================================================
'  معمل التحاليل - المرحلة 2 : بناء الفورمات تلقائيًا
' ----------------------------------------------------------------------------
'  يبني هذا الكود الفورمات الآتية دفعة واحدة:
'     frmMain  (الشاشة الرئيسية)
'     frmPatient  (تسجيل مريض)
'     frmTests  (إدارة التحاليل والأسعار)
'     frmOrder + sfrmOrderDetails  (طلب تحاليل مع فورم فرعي)
'     frmResults + sfrmResults  (إدخال النتائج)
'     frmSearch + sfrmSearch  (بحث عن مريض وسجله)
'
'  المتطلبات قبل التشغيل:
'     1) أن تكون قد شغّلت كود المرحلة 1 (BuildDatabase) والجداول موجودة
'     2) أن تكون قد لصقت وحدة basLab
'
'  طريقة التشغيل:
'     Insert > Module  ثم الصق هذا الملف، ثم ضع المؤشر داخل BuildAllForms واضغط F5
'
'  ملاحظة مهمة: كل فورم يُبنى داخل معالجة أخطاء مستقلة، فلو تعثّر فورم واحد
'  يكمل الباقي ويخبرك باسم المتعثّر. أرسل لي اسمه وأصلحه لك بدقة.
' ============================================================================

Public Sub BuildAllForms()
    Dim log As String
    log = TryBuild("frmMain", "BuildMain")
    log = log & TryBuild("frmPatient", "BuildPatient")
    log = log & TryBuild("frmTests", "BuildTests")
    log = log & TryBuild("sfrmOrderDetails", "BuildOrderSub")   ' الفرعي قبل الرئيسي
    log = log & TryBuild("frmOrder", "BuildOrder")
    log = log & TryBuild("sfrmResults", "BuildResultsSub")
    log = log & TryBuild("frmResults", "BuildResults")
    log = log & TryBuild("sfrmSearch", "BuildSearchSub")
    log = log & TryBuild("frmSearch", "BuildSearch")

    SetStartupForm "frmMain"

    MsgBox "انتهى بناء الفورمات." & vbCrLf & vbCrLf & log & vbCrLf & _
           "تم ضبط frmMain لتفتح تلقائيًا (يظهر بعد إغلاق وإعادة فتح الملف).", _
           vbInformation, "نتيجة البناء"
End Sub

' يشغّل دالة بناء فورم ويعيد سطر حالة (نجاح/فشل)
Private Function TryBuild(formName As String, procName As String) As String
    On Error GoTo Fail
    DeleteFormIfExists formName
    Application.Run procName
    TryBuild = "[نجح] " & formName & vbCrLf
    Exit Function
Fail:
    TryBuild = "[فشل] " & formName & "  ->  " & Err.Description & vbCrLf
End Function


' ===========================================================================
'  أدوات مساعدة للبناء
' ===========================================================================

Private Function CM(ByVal cmVal As Double) As Long
    CM = CLng(cmVal * 567)          ' تحويل سنتيمتر إلى twips
End Function

' تجعل الفورم من اليمين لليسار (عربي)
Private Sub SetRTL(frm As Form)
    On Error Resume Next
    frm.Orientation = 1             ' 1 = من اليمين لليسار
End Sub

' إضافة عنوان (Label) نصي
Private Function AddLabel(frmName As String, cap As String, _
                          l As Double, t As Double, w As Double, Optional h As Double = 0.6) As Control
    Dim c As Control
    Set c = CreateControl(frmName, acLabel, acDetail, , "", CM(l), CM(t), CM(w), CM(h))
    c.Caption = cap
    Set AddLabel = c
End Function

' إضافة صندوق نص مرتبط بحقل
Private Function AddBox(frmName As String, fieldName As String, _
                        l As Double, t As Double, w As Double, Optional h As Double = 0.6) As Control
    Dim c As Control
    Set c = CreateControl(frmName, acTextBox, acDetail, , fieldName, CM(l), CM(t), CM(w), CM(h))
    c.Name = "txt" & fieldName
    Set AddBox = c
End Function

' إضافة زر أمر
Private Function AddBtn(frmName As String, cap As String, onClickExpr As String, _
                        l As Double, t As Double, w As Double, Optional h As Double = 0.8) As Control
    Dim c As Control
    Set c = CreateControl(frmName, acCommandButton, acDetail, , "", CM(l), CM(t), CM(w), CM(h))
    c.Caption = cap
    c.OnClick = onClickExpr
    Set AddBtn = c
End Function

' إضافة قائمة منسدلة مرتبطة بحقل مع مصدر بيانات
Private Function AddCombo(frmName As String, fieldName As String, rowSrc As String, _
                          colCount As Integer, colWidths As String, _
                          l As Double, t As Double, w As Double) As Control
    Dim c As Control
    Set c = CreateControl(frmName, acComboBox, acDetail, , fieldName, CM(l), CM(t), CM(w), CM(0.6))
    c.Name = "cbo" & fieldName
    c.RowSourceType = "Table/Query"
    c.RowSource = rowSrc
    c.ColumnCount = colCount
    c.ColumnWidths = colWidths
    c.BoundColumn = 1
    Set AddCombo = c
End Function

' حفظ الفورم باسمه النهائي
Private Sub SaveForm(frm As Form, finalName As String)
    Dim tmp As String
    tmp = frm.Name
    DoCmd.Save acForm, tmp
    DoCmd.Close acForm, tmp, acSaveYes
    DoCmd.Rename finalName, acForm, tmp
End Sub

' حذف فورم لو موجود (لإعادة التشغيل بأمان)
Private Sub DeleteFormIfExists(formName As String)
    On Error Resume Next
    DoCmd.DeleteObject acForm, formName
    On Error GoTo 0
End Sub

' ضبط الفورم الذي يفتح تلقائيًا عند فتح قاعدة البيانات
Private Sub SetStartupForm(formName As String)
    On Error Resume Next
    Dim db As DAO.Database
    Set db = CurrentDb
    Dim p As DAO.Property
    On Error Resume Next
    db.Properties("StartupForm") = formName
    If Err.Number <> 0 Then
        Set p = db.CreateProperty("StartupForm", dbText, formName)
        db.Properties.Append p
    End If
    On Error GoTo 0
End Sub


' ===========================================================================
'  1) الشاشة الرئيسية frmMain  (غير مرتبطة بجدول - مجرد أزرار)
' ===========================================================================
Public Sub BuildMain()
    Dim frm As Form
    Set frm = CreateForm()
    frm.Caption = "معمل التحاليل الطبية"
    SetRTL frm

    AddLabel frm.Name, "نظام إدارة معمل التحاليل الطبية", 1, 0.5, 12, 1#

    AddBtn frm.Name, "مريض جديد", "=Nav(""frmPatient"")", 8, 2, 5, 1
    AddBtn frm.Name, "طلب تحاليل جديد", "=Nav(""frmOrder"")", 2, 2, 5, 1
    AddBtn frm.Name, "إدخال النتائج", "=Nav(""frmResults"")", 8, 3.3, 5, 1
    AddBtn frm.Name, "بحث عن مريض", "=Nav(""frmSearch"")", 2, 3.3, 5, 1
    AddBtn frm.Name, "إدارة التحاليل والأسعار", "=Nav(""frmTests"")", 8, 4.6, 5, 1
    AddBtn frm.Name, "الإعدادات (بيانات المعمل)", "=Nav(""tblSettings"")", 2, 4.6, 5, 1

    frm.Section(acDetail).Height = CM(6.5)
    SaveForm frm, "frmMain"
End Sub


' ===========================================================================
'  2) فورم المريض frmPatient
' ===========================================================================
Public Sub BuildPatient()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "Patients"
    frm.Caption = "تسجيل / تعديل مريض"
    SetRTL frm

    ' صف = عنوان يمين + صندوق يساره
    AddLabel frm.Name, "الاسم:", 13, 0.5, 3:      AddBox frm.Name, "Full_Name", 6, 0.5, 6.5
    AddLabel frm.Name, "التليفون:", 13, 1.3, 3:   AddBox frm.Name, "Phone", 9.5, 1.3, 3
    AddLabel frm.Name, "النوع:", 13, 2.1, 3
    Dim g As Control
    Set g = AddCombo(frm.Name, "Gender", "SELECT ""ذكر"" UNION SELECT ""أنثى"";", 1, "3cm", 9.5, 2.1, 3)
    g.RowSourceType = "Value List": g.RowSource = "ذكر;أنثى"
    AddLabel frm.Name, "تاريخ الميلاد:", 13, 2.9, 3
    Dim b As Control
    Set b = AddBox(frm.Name, "Birth_Date", 9.5, 2.9, 3)
    b.AfterUpdate = "=AgeUpdate()"            ' يحسب السن تلقائيًا
    AddLabel frm.Name, "السن:", 13, 3.7, 3:      AddBox frm.Name, "Age", 11.5, 3.7, 1
    AddLabel frm.Name, "العنوان:", 13, 4.5, 3:    AddBox frm.Name, "Address", 6, 4.5, 6.5
    AddLabel frm.Name, "الطبيب المحوِّل:", 13, 5.3, 3: AddBox frm.Name, "Referring_Doctor", 6, 5.3, 6.5

    AddBtn frm.Name, "جديد", "=NavNewPatient()", 11, 6.3, 2.5
    AddBtn frm.Name, "حفظ", "=SaveCurrent()", 8, 6.3, 2.5
    AddBtn frm.Name, "رجوع", "=CloseMe()", 5, 6.3, 2.5

    frm.Section(acDetail).Height = CM(7.6)
    SaveForm frm, "frmPatient"
End Sub


' ===========================================================================
'  3) فورم التحاليل frmTests
' ===========================================================================
Public Sub BuildTests()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "Tests"
    frm.Caption = "إدارة التحاليل والأسعار"
    SetRTL frm

    AddLabel frm.Name, "اسم التحليل:", 13, 0.5, 3:   AddBox frm.Name, "Test_Name", 6, 0.5, 6.5
    AddLabel frm.Name, "الكود:", 13, 1.3, 3:          AddBox frm.Name, "Test_Code", 10, 1.3, 2.5
    AddLabel frm.Name, "التصنيف:", 13, 2.1, 3:        AddBox frm.Name, "Category", 9, 2.1, 3.5
    AddLabel frm.Name, "الوحدة:", 13, 2.9, 3:         AddBox frm.Name, "Unit", 10, 2.9, 2.5
    AddLabel frm.Name, "المدى الطبيعي من:", 13, 3.7, 3: AddBox frm.Name, "Normal_Range_Min", 10, 3.7, 2.5
    AddLabel frm.Name, "إلى:", 8, 3.7, 1.5:           AddBox frm.Name, "Normal_Range_Max", 6, 3.7, 1.5
    AddLabel frm.Name, "مدى نصي:", 13, 4.5, 3:        AddBox frm.Name, "Normal_Range_Text", 9, 4.5, 3.5
    AddLabel frm.Name, "ملاحظات المدى:", 13, 5.3, 3:  AddBox frm.Name, "Normal_Range_Notes", 6, 5.3, 6.5
    AddLabel frm.Name, "السعر:", 13, 6.1, 3:          AddBox frm.Name, "Price", 10, 6.1, 2.5
    AddLabel frm.Name, "نوع العينة:", 13, 6.9, 3:     AddBox frm.Name, "Sample_Type", 9, 6.9, 3.5
    AddLabel frm.Name, "نشط؟", 13, 7.7, 3
    CreateControl frm.Name, acCheckBox, acDetail, , "Is_Active", CM(12), CM(7.7), CM(0.5), CM(0.5)

    AddBtn frm.Name, "جديد", "=NavNewRecord()", 11, 8.6, 2.5
    AddBtn frm.Name, "حفظ", "=SaveCurrent()", 8, 8.6, 2.5
    AddBtn frm.Name, "رجوع", "=CloseMe()", 5, 8.6, 2.5

    frm.Section(acDetail).Height = CM(10)
    SaveForm frm, "frmTests"
End Sub


' ===========================================================================
'  4أ) الفورم الفرعي لتفاصيل الطلب sfrmOrderDetails  (شكل جدول Datasheet)
' ===========================================================================
Public Sub BuildOrderSub()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "Order_Details"
    frm.DefaultView = 2                        ' 2 = Datasheet (شكل جدول)
    frm.Caption = "تفاصيل الطلب"
    SetRTL frm

    ' قائمة اختيار التحليل (تعرض الاسم وتخزّن الرقم)
    Dim c As Control
    Set c = AddCombo(frm.Name, "Test_ID", _
        "SELECT Test_ID, Test_Name FROM Tests WHERE Is_Active=True ORDER BY Test_Name;", _
        2, "0cm;6cm", 0.2, 0.2, 6)
    c.AfterUpdate = "=OnPickTest()"            ' ينسخ السعر تلقائيًا

    AddBox frm.Name, "Price_At_Order", 6.4, 0.2, 2
    AddBox frm.Name, "Result_Value", 8.6, 0.2, 3
    AddBox frm.Name, "Result_Status", 11.8, 0.2, 2.5

    SaveForm frm, "sfrmOrderDetails"
End Sub

' ===========================================================================
'  4ب) فورم طلب التحاليل frmOrder
' ===========================================================================
Public Sub BuildOrder()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "Orders"
    frm.Caption = "طلب تحاليل جديد"
    SetRTL frm

    AddLabel frm.Name, "المريض:", 13, 0.5, 3
    AddCombo frm.Name, "Patient_ID", _
        "SELECT Patient_ID, Full_Name, Phone FROM Patients ORDER BY Full_Name;", _
        3, "0cm;6cm;3cm", 4, 0.5, 8.5
    AddBtn frm.Name, "مريض جديد", "=NavNewPatient()", 1, 0.5, 2.8

    AddLabel frm.Name, "تاريخ الطلب:", 13, 1.3, 3:  AddBox frm.Name, "Order_Date", 9.5, 1.3, 3
    AddLabel frm.Name, "الحالة:", 13, 2.1, 3:        AddBox frm.Name, "Status", 9.5, 2.1, 3

    ' الفورم الفرعي (التحاليل)
    Dim sub1 As Control
    Set sub1 = CreateControl(frm.Name, acSubform, acDetail, , "", CM(1), CM(3), CM(13), CM(5))
    sub1.Name = "sfDetails"
    sub1.SourceObject = "sfrmOrderDetails"
    sub1.LinkMasterFields = "Order_ID"
    sub1.LinkChildFields = "Order_ID"

    ' الإجمالي = مجموع الأسعار في الفورم الفرعي (بدون كود - تعبير مباشر)
    AddLabel frm.Name, "الإجمالي:", 13, 8.3, 3
    Dim t As Control
    Set t = CreateControl(frm.Name, acTextBox, acDetail, , "", CM(9.5), CM(8.3), CM(3), CM(0.6))
    t.Name = "txtTotal"
    t.ControlSource = "=Nz(DSum(""Price_At_Order"",""Order_Details"",""Order_ID="" & [Order_ID]),0)"

    AddLabel frm.Name, "المدفوع:", 13, 9.1, 3:  AddBox frm.Name, "Amount_Paid", 9.5, 9.1, 3
    AddLabel frm.Name, "المتبقي:", 13, 9.9, 3
    Dim r As Control
    Set r = CreateControl(frm.Name, acTextBox, acDetail, , "", CM(9.5), CM(9.9), CM(3), CM(0.6))
    r.Name = "txtRemain"
    r.ControlSource = "=[txtTotal]-Nz([Amount_Paid],0)"

    AddBtn frm.Name, "حفظ", "=SaveOrder()", 10, 10.9, 2.5
    AddBtn frm.Name, "حفظ + طباعة إيصال PDF", "=DoInvoicePDF()", 5.5, 10.9, 4.2
    AddBtn frm.Name, "رجوع", "=CloseMe()", 2.5, 10.9, 2.5

    frm.Section(acDetail).Height = CM(12)
    SaveForm frm, "frmOrder"
End Sub


' ===========================================================================
'  5أ) الفورم الفرعي للنتائج sfrmResults
' ===========================================================================
Public Sub BuildResultsSub()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "Order_Details"
    frm.DefaultView = 2
    frm.Caption = "إدخال النتائج"
    SetRTL frm

    ' التحليل (للعرض فقط)
    Dim c As Control
    Set c = AddCombo(frm.Name, "Test_ID", _
        "SELECT Test_ID, Test_Name FROM Tests ORDER BY Test_Name;", _
        2, "0cm;6cm", 0.2, 0.2, 6)

    Dim v As Control
    Set v = AddBox(frm.Name, "Result_Value", 6.4, 0.2, 3)
    v.AfterUpdate = "=OnResultEntered()"       ' يحدد الحالة تلقائيًا
    AddBox frm.Name, "Result_Status", 9.6, 0.2, 2.5
    AddBox frm.Name, "Result_Date", 12.2, 0.2, 2.5

    SaveForm frm, "sfrmResults"
End Sub

' ===========================================================================
'  5ب) فورم إدخال النتائج frmResults
' ===========================================================================
Public Sub BuildResults()
    Dim frm As Form
    Set frm = CreateForm()
    ' الطلبات التي حالتها مسجل أو جاري فقط
    frm.RecordSource = "SELECT * FROM Orders WHERE Status IN ('مسجل','جاري') ORDER BY Order_Date DESC;"
    frm.Caption = "إدخال النتائج"
    SetRTL frm

    AddLabel frm.Name, "اذهب إلى طلب رقم:", 13, 0.5, 4
    Dim p As Control
    Set p = CreateControl(frm.Name, acComboBox, acDetail, , "", CM(8), CM(0.5), CM(4.5), CM(0.6))
    p.Name = "cboPick"
    p.RowSourceType = "Table/Query"
    p.RowSource = "SELECT Order_ID, Order_ID FROM Orders WHERE Status IN ('مسجل','جاري') ORDER BY Order_ID DESC;"
    p.ColumnCount = 1
    p.AfterUpdate = "=GoToOrder()"

    AddLabel frm.Name, "رقم الطلب:", 13, 1.3, 3:  AddBox frm.Name, "Order_ID", 10, 1.3, 2.5
    AddLabel frm.Name, "الحالة:", 13, 2.1, 3:      AddBox frm.Name, "Status", 10, 2.1, 2.5

    Dim sub1 As Control
    Set sub1 = CreateControl(frm.Name, acSubform, acDetail, , "", CM(1), CM(3), CM(13), CM(5))
    sub1.Name = "sfResults"
    sub1.SourceObject = "sfrmResults"
    sub1.LinkMasterFields = "Order_ID"
    sub1.LinkChildFields = "Order_ID"

    AddBtn frm.Name, "حفظ + الطلب جاهز", "=SetOrderStatus(""جاهز"")", 9.5, 8.3, 3.5
    AddBtn frm.Name, "تصدير تقرير النتيجة PDF", "=DoResultPDF()", 5, 8.3, 4.2
    AddBtn frm.Name, "رجوع", "=CloseMe()", 2.5, 8.3, 2.3

    frm.Section(acDetail).Height = CM(9.5)
    SaveForm frm, "frmResults"
End Sub


' ===========================================================================
'  6أ) الفورم الفرعي لسجل المريض sfrmSearch
' ===========================================================================
Public Sub BuildSearchSub()
    Dim frm As Form
    Set frm = CreateForm()
    ' لا بد من وجود Patient_ID في المصدر حتى يعمل الربط مع القائمة (وإن لم نعرضه)
    frm.RecordSource = "SELECT Patient_ID, Order_ID, Order_Date, Status, Total_Price, Amount_Paid FROM Orders ORDER BY Order_Date DESC;"
    frm.DefaultView = 2
    frm.Caption = "طلبات المريض"
    SetRTL frm

    AddBox frm.Name, "Order_ID", 0.2, 0.2, 2
    AddBox frm.Name, "Order_Date", 2.4, 0.2, 3
    AddBox frm.Name, "Status", 5.6, 0.2, 2.5
    AddBox frm.Name, "Total_Price", 8.3, 0.2, 2.5
    AddBox frm.Name, "Amount_Paid", 11, 0.2, 2.5

    SaveForm frm, "sfrmSearch"
End Sub

' ===========================================================================
'  6ب) فورم البحث عن مريض frmSearch
' ===========================================================================
Public Sub BuildSearch()
    Dim frm As Form
    Set frm = CreateForm()
    frm.Caption = "بحث عن مريض وسجله"
    SetRTL frm

    AddLabel frm.Name, "اختر المريض (بالاسم أو التليفون):", 13, 0.5, 5
    Dim c As Control
    Set c = CreateControl(frm.Name, acComboBox, acDetail, , "", CM(3), CM(0.5), CM(8), CM(0.6))
    c.Name = "cboPatient"
    c.RowSourceType = "Table/Query"
    c.RowSource = "SELECT Patient_ID, Full_Name, Phone FROM Patients ORDER BY Full_Name;"
    c.ColumnCount = 3
    c.ColumnWidths = "0cm;6cm;3cm"
    c.BoundColumn = 1
    c.AfterUpdate = "=RequerySub()"

    ' الفورم الفرعي مربوط بقيمة القائمة (يتصفّى تلقائيًا عند اختيار مريض)
    Dim sub1 As Control
    Set sub1 = CreateControl(frm.Name, acSubform, acDetail, , "", CM(1), CM(1.5), CM(13), CM(6))
    sub1.Name = "sfOrders"
    sub1.SourceObject = "sfrmSearch"
    sub1.LinkMasterFields = "cboPatient"
    sub1.LinkChildFields = "Patient_ID"

    AddBtn frm.Name, "تصدير نتيجة الطلب المحدد PDF", "=ExportSelectedResult()", 8, 7.8, 5
    AddBtn frm.Name, "رجوع", "=CloseMe()", 5, 7.8, 2.5

    frm.Section(acDetail).Height = CM(9)
    SaveForm frm, "frmSearch"
End Sub

Option Compare Database
Option Explicit

' ============================================================================
'  معمل التحاليل - المرحلة 3 : بناء الاستعلامات والتقارير تلقائيًا
' ----------------------------------------------------------------------------
'  ينشئ:
'    استعلامات:  qryResult , qryInvoice , qryDaily
'    تقارير:     rptResult (تقرير النتيجة) , rptInvoice (الإيصال) , rptDaily (تقرير يومي)
'
'  بعد تشغيله ستعمل أزرار الـ PDF في الفورمات (المرحلة 2).
'
'  المتطلبات: أن تكون أنهيت المرحلة 1 و 2، ووحدة basLab موجودة.
'
'  التشغيل: Insert > Module ، الصق هذا الملف، ضع المؤشر داخل BuildAllReports واضغط F5.
'
'  ملاحظة: بيانات المعمل (الاسم/العنوان/التليفون/التوقيع) تُقرأ تلقائيًا من جدول
'          tblSettings عبر الدالة GetSetting، فتعديلها من مكان واحد يغيّر كل التقارير.
' ============================================================================

Public Sub BuildAllReports()
    Dim log As String
    log = TryStep("qryResult", "MakeQryResult")
    log = log & TryStep("qryInvoice", "MakeQryInvoice")
    log = log & TryStep("qryDaily", "MakeQryDaily")
    log = log & TryStep("rptResult", "BuildRptResult")
    log = log & TryStep("rptInvoice", "BuildRptInvoice")
    log = log & TryStep("rptDaily", "BuildRptDaily")

    MsgBox "انتهى بناء التقارير." & vbCrLf & vbCrLf & log & vbCrLf & _
           "الآن جرّب أزرار PDF من فورم الطلب وفورم النتائج.", _
           vbInformation, "نتيجة البناء"
End Sub

Private Function TryStep(objName As String, procName As String) As String
    On Error GoTo Fail
    DeleteObjIfExists objName
    Application.Run procName
    TryStep = "[نجح] " & objName & vbCrLf
    Exit Function
Fail:
    TryStep = "[فشل] " & objName & "  ->  " & Err.Description & vbCrLf
End Function

Private Sub DeleteObjIfExists(objName As String)
    On Error Resume Next
    DoCmd.DeleteObject acQuery, objName
    DoCmd.DeleteObject acReport, objName
    On Error GoTo 0
End Sub


' ===========================================================================
'  الاستعلامات
' ===========================================================================

' استعلام تقرير النتيجة: يجمع بيانات المريض + الطلب + التحاليل + النتائج
Public Sub MakeQryResult()
    Dim sql As String
    sql = "SELECT o.Order_ID, o.Order_Date, p.Full_Name, p.Age, p.Gender, " & _
          "p.Referring_Doctor, od.Result_Value, od.Result_Status, od.Result_Date, " & _
          "t.Test_Name, t.Unit, " & _
          "IIf(Len(Nz(t.Normal_Range_Text,''))>0, t.Normal_Range_Text, " & _
          "  IIf(IsNull(t.Normal_Range_Min),'', t.Normal_Range_Min & ' - ' & t.Normal_Range_Max)) AS NRange " & _
          "FROM ((Orders AS o INNER JOIN Patients AS p ON o.Patient_ID=p.Patient_ID) " & _
          "INNER JOIN Order_Details AS od ON o.Order_ID=od.Order_ID) " & _
          "INNER JOIN Tests AS t ON od.Test_ID=t.Test_ID " & _
          "ORDER BY o.Order_ID, t.Test_Name;"
    CurrentDb.CreateQueryDef "qryResult", sql
End Sub

' استعلام الإيصال: بيانات المريض + الطلب + الأسعار
Public Sub MakeQryInvoice()
    Dim sql As String
    sql = "SELECT o.Order_ID, o.Order_Date, o.Amount_Paid, p.Full_Name, " & _
          "od.Price_At_Order, t.Test_Name " & _
          "FROM ((Orders AS o INNER JOIN Patients AS p ON o.Patient_ID=p.Patient_ID) " & _
          "INNER JOIN Order_Details AS od ON o.Order_ID=od.Order_ID) " & _
          "INNER JOIN Tests AS t ON od.Test_ID=t.Test_ID " & _
          "ORDER BY o.Order_ID, t.Test_Name;"
    CurrentDb.CreateQueryDef "qryInvoice", sql
End Sub

' استعلام التقرير اليومي: طلب واحد في كل سطر
Public Sub MakeQryDaily()
    Dim sql As String
    sql = "SELECT o.Order_ID, o.Order_Date, p.Full_Name, o.Total_Price, o.Amount_Paid " & _
          "FROM Orders AS o INNER JOIN Patients AS p ON o.Patient_ID=p.Patient_ID " & _
          "ORDER BY o.Order_Date;"
    CurrentDb.CreateQueryDef "qryDaily", sql
End Sub


' ===========================================================================
'  أدوات مساعدة لبناء التقارير
' ===========================================================================

Private Function CM(ByVal cmVal As Double) As Long
    CM = CLng(cmVal * 567)
End Function

' عنوان ثابت
Private Function RLbl(rptName As String, sec As Integer, cap As String, _
                      l As Double, t As Double, w As Double, Optional h As Double = 0.6, _
                      Optional bold As Boolean = False, Optional fontSize As Integer = 11) As Control
    Dim c As Control
    Set c = CreateReportControl(rptName, acLabel, sec, , "", CM(l), CM(t), CM(w), CM(h))
    c.Caption = cap
    c.FontSize = fontSize
    c.FontWeight = IIf(bold, 700, 400)
    Set RLbl = c
End Function

' صندوق مرتبط بحقل أو تعبير
Private Function RBox(rptName As String, sec As Integer, src As String, _
                      l As Double, t As Double, w As Double, Optional h As Double = 0.6, _
                      Optional bold As Boolean = False, Optional fontSize As Integer = 11) As Control
    Dim c As Control
    Set c = CreateReportControl(rptName, acTextBox, sec, , "", CM(l), CM(t), CM(w), CM(h))
    c.ControlSource = src
    c.FontSize = fontSize
    c.FontWeight = IIf(bold, 700, 400)
    Set RBox = c
End Function

' خط أفقي فاصل
Private Sub RLine(rptName As String, sec As Integer, l As Double, t As Double, w As Double)
    CreateReportControl rptName, acLine, sec, , "", CM(l), CM(t), CM(w), 0
End Sub

Private Sub SaveReport(rpt As Report, finalName As String)
    Dim tmp As String
    tmp = rpt.Name
    DoCmd.Save acReport, tmp
    DoCmd.Close acReport, tmp, acSaveYes
    DoCmd.Rename finalName, acReport, tmp
End Sub


' ===========================================================================
'  تقرير النتيجة  rptResult
' ===========================================================================
Public Sub BuildRptResult()
    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryResult"

    ' نجمّع حسب رقم الطلب: رأس المجموعة يحمل بيانات المعمل والمريض
    Dim gl As Integer
    gl = CreateGroupLevel(rpt.Name, "Order_ID", True, False)   ' 0 => Header=acGroupLevel1Header(5)

    Const GH As Integer = 5      ' رأس المجموعة
    Const DET As Integer = 0     ' التفاصيل
    Const PH As Integer = 3      ' رأس الصفحة
    Const PF As Integer = 4      ' ذيل الصفحة
    Const RF As Integer = 2      ' ذيل التقرير

    ' --- رأس المجموعة: مكان اللوجو + بيانات المعمل + بيانات المريض ---
    ' مكان اللوجو (صورة فارغة تستبدلها بصورتك من Design View)
    CreateReportControl rpt.Name, acImage, GH, , "", CM(0.5), CM(0.2), CM(3), CM(2.5)

    RBox rpt.Name, GH, "=GetSetting(""Lab_Name"")", 4, 0.2, 10, 0.8, True, 16
    RBox rpt.Name, GH, "=GetSetting(""Lab_Address"")", 4, 1#, 10, 0.6, False, 10
    RBox rpt.Name, GH, "=""تليفون: "" & GetSetting(""Lab_Phone"")", 4, 1.6, 10, 0.6, False, 10

    RLbl rpt.Name, GH, "تقرير نتيجة تحاليل", 4, 2.4, 10, 0.8, True, 14
    RLine rpt.Name, GH, 0.5, 3.3, 19

    ' بيانات المريض/الطلب (سطران)
    RBox rpt.Name, GH, "=""الاسم: "" & [Full_Name]", 13, 3.5, 6.5
    RBox rpt.Name, GH, "=""السن: "" & Nz([Age],"""")", 10, 3.5, 3
    RBox rpt.Name, GH, "=""النوع: "" & Nz([Gender],"""")", 7, 3.5, 3
    RBox rpt.Name, GH, "=""رقم الطلب: "" & [Order_ID]", 4, 3.5, 3

    RBox rpt.Name, GH, "=""الطبيب المحوِّل: "" & Nz([Referring_Doctor],"""")", 13, 4.1, 6.5
    RBox rpt.Name, GH, "=""تاريخ الطلب: "" & Format([Order_Date],""yyyy/mm/dd"")", 8.5, 4.1, 4.5
    RBox rpt.Name, GH, "=""تاريخ النتيجة: "" & Format(Nz([Result_Date],Now()),""yyyy/mm/dd"")", 4, 4.1, 4.5

    ' عناوين أعمدة الجدول (في رأس المجموعة أسفل البيانات)
    RLine rpt.Name, GH, 0.5, 4.9, 19
    RLbl rpt.Name, GH, "اسم التحليل", 13, 5#, 6.5, 0.6, True
    RLbl rpt.Name, GH, "النتيجة", 10, 5#, 3, 0.6, True
    RLbl rpt.Name, GH, "الوحدة", 8, 5#, 2, 0.6, True
    RLbl rpt.Name, GH, "المدى الطبيعي", 4.5, 5#, 3.5, 0.6, True
    RLbl rpt.Name, GH, "الحالة", 0.5, 5#, 4, 0.6, True
    rpt.Section(GH).Height = CM(5.8)

    ' --- التفاصيل: سطر لكل تحليل ---
    RBox rpt.Name, DET, "=[Test_Name]", 13, 0.1, 6.5
    RBox rpt.Name, DET, "=[Result_Value]", 10, 0.1, 3
    RBox rpt.Name, DET, "=[Unit]", 8, 0.1, 2
    RBox rpt.Name, DET, "=[NRange]", 4.5, 0.1, 3.5
    RBox rpt.Name, DET, "=[Result_Status]", 0.5, 0.1, 4
    rpt.Section(DET).Height = CM(0.75)

    ' --- ذيل التقرير: مساحة التوقيع ---
    RLine rpt.Name, RF, 13, 1.2, 5
    RBox rpt.Name, RF, "=""التوقيع: "" & GetSetting(""Signatory_Name"")", 13, 1.3, 6
    rpt.Section(RF).Height = CM(2.5)

    ' --- ذيل الصفحة: رقم الصفحة + العبارة ---
    RBox rpt.Name, PF, "=""صفحة "" & [Page] & "" من "" & [Pages]", 0.5, 0.2, 4
    RLbl rpt.Name, PF, "هذه النتائج للأغراض الطبية فقط", 8, 0.2, 8
    rpt.Section(PF).Height = CM(1)

    SaveReport rpt, "rptResult"
End Sub


' ===========================================================================
'  الإيصال / الفاتورة  rptInvoice
' ===========================================================================
Public Sub BuildRptInvoice()
    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryInvoice"

    CreateGroupLevel rpt.Name, "Order_ID", True, True     ' رأس + ذيل للمجموعة

    Const GH As Integer = 5
    Const GF As Integer = 6
    Const DET As Integer = 0
    Const PF As Integer = 4

    ' رأس المجموعة: بيانات المعمل + المريض + عناوين الأعمدة
    RBox rpt.Name, GH, "=GetSetting(""Lab_Name"")", 4, 0.2, 15, 0.8, True, 16
    RBox rpt.Name, GH, "=GetSetting(""Lab_Address"")", 4, 1#, 15, 0.6, False, 10
    RBox rpt.Name, GH, "=""تليفون: "" & GetSetting(""Lab_Phone"")", 4, 1.6, 15, 0.6, False, 10
    RLbl rpt.Name, GH, "إيصال / فاتورة", 4, 2.4, 10, 0.8, True, 14
    RLine rpt.Name, GH, 0.5, 3.3, 19

    RBox rpt.Name, GH, "=""الاسم: "" & [Full_Name]", 12, 3.5, 7
    RBox rpt.Name, GH, "=""رقم الطلب: "" & [Order_ID]", 8, 3.5, 4
    RBox rpt.Name, GH, "=""التاريخ: "" & Format([Order_Date],""yyyy/mm/dd"")", 3.5, 3.5, 4.5

    RLine rpt.Name, GH, 0.5, 4.3, 19
    RLbl rpt.Name, GH, "اسم التحليل", 10, 4.4, 9, 0.6, True
    RLbl rpt.Name, GH, "السعر", 0.5, 4.4, 4, 0.6, True
    rpt.Section(GH).Height = CM(5.2)

    ' التفاصيل: تحليل + سعره
    RBox rpt.Name, DET, "=[Test_Name]", 10, 0.1, 9
    RBox rpt.Name, DET, "=[Price_At_Order]", 0.5, 0.1, 4
    rpt.Section(DET).Height = CM(0.7)

    ' ذيل المجموعة: الإجمالي/المدفوع/المتبقي + ميعاد الاستلام
    RLine rpt.Name, GF, 0.5, 0.1, 19
    RBox rpt.Name, GF, "=""الإجمالي: "" & Sum([Price_At_Order])", 13, 0.3, 6, 0.6, True
    RBox rpt.Name, GF, "=""المدفوع: "" & Nz(First([Amount_Paid]),0)", 13, 0.9, 6
    RBox rpt.Name, GF, "=""المتبقي: "" & (Sum([Price_At_Order]) - Nz(First([Amount_Paid]),0))", 13, 1.5, 6, 0.6, True
    RBox rpt.Name, GF, "=""ميعاد الاستلام المتوقع: "" & Format(DateAdd(""d"",1,First([Order_Date])),""yyyy/mm/dd"")", 3, 1.5, 8
    rpt.Section(GF).Height = CM(2.5)

    RBox rpt.Name, PF, "=""صفحة "" & [Page] & "" من "" & [Pages]", 0.5, 0.2, 4
    rpt.Section(PF).Height = CM(0.9)

    SaveReport rpt, "rptInvoice"
End Sub


' ===========================================================================
'  التقرير اليومي  rptDaily  (اختياري)
'  يُفتح مفلترًا على يوم معيّن؛ يعرض الطلبات ويجمع العدد والتحصيل
' ===========================================================================
Public Sub BuildRptDaily()
    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryDaily"

    Const PH As Integer = 3
    Const DET As Integer = 0
    Const RF As Integer = 2

    RBox rpt.Name, PH, "=GetSetting(""Lab_Name"") & "" - تقرير يومي""", 4, 0.2, 15, 0.8, True, 14
    RLine rpt.Name, PH, 0.5, 1.2, 19
    RLbl rpt.Name, PH, "رقم الطلب", 16, 1.3, 3, 0.6, True
    RLbl rpt.Name, PH, "التاريخ", 12, 1.3, 4, 0.6, True
    RLbl rpt.Name, PH, "المريض", 5, 1.3, 7, 0.6, True
    RLbl rpt.Name, PH, "الإجمالي", 2.5, 1.3, 2.5, 0.6, True
    RLbl rpt.Name, PH, "المدفوع", 0.2, 1.3, 2.3, 0.6, True
    rpt.Section(PH).Height = CM(2)

    RBox rpt.Name, DET, "=[Order_ID]", 16, 0.1, 3
    RBox rpt.Name, DET, "=Format([Order_Date],""yyyy/mm/dd"")", 12, 0.1, 4
    RBox rpt.Name, DET, "=[Full_Name]", 5, 0.1, 7
    RBox rpt.Name, DET, "=[Total_Price]", 2.5, 0.1, 2.5
    RBox rpt.Name, DET, "=[Amount_Paid]", 0.2, 0.1, 2.3
    rpt.Section(DET).Height = CM(0.7)

    RLine rpt.Name, RF, 0.5, 0.1, 19
    RBox rpt.Name, RF, "=""عدد الطلبات: "" & Count([Order_ID])", 13, 0.3, 6, 0.6, True
    RBox rpt.Name, RF, "=""إجمالي التحصيل: "" & Sum([Amount_Paid])", 13, 0.9, 6, 0.6, True
    rpt.Section(RF).Height = CM(2)

    SaveReport rpt, "rptDaily"
End Sub

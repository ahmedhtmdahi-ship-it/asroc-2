Option Compare Database
Option Explicit

' ============================================================================
'  basLab  -  وحدة المنطق الرئيسية للمعمل (المرحلة 2)
' ----------------------------------------------------------------------------
'  هذه الوحدة تحتوي كل "الوظائف الذكية" التي تستدعيها الفورمات:
'   - حساب السن من تاريخ الميلاد
'   - تحديد حالة النتيجة تلقائيًا (طبيعي/مرتفع/منخفض)
'   - نسخ سعر التحليل وقت الطلب
'   - قراءة إعدادات المعمل من جدول tblSettings
'   - أزرار التنقل بين الفورمات
'   - تصدير التقارير PDF
'
'  طريقة اللصق:  Alt+F11  ثم  Insert > Module  ثم الصق كل هذا الملف.
'  اسم الوحدة: سمّها basLab (من نافذة Properties يسار المحرر: Name = basLab)
'
'  ملاحظة: بعض الدوال تُرجع Null وتُستدعى من خصائص الأحداث بصيغة  =OnPickTest()
'          وهذا مقصود حتى تعمل بدون كتابة كود داخل كل فورم.
' ============================================================================


' ---------------------------------------------------------------------------
'  1) حساب السن بالسنوات من تاريخ الميلاد
' ---------------------------------------------------------------------------
Public Function CalcAge(vBirth As Variant) As Variant
    If IsNull(vBirth) Then CalcAge = Null: Exit Function
    If Not IsDate(vBirth) Then CalcAge = Null: Exit Function

    Dim a As Integer
    a = DateDiff("yyyy", vBirth, Date)                 ' فرق السنوات المبدئي
    ' لو لم يأتِ عيد الميلاد هذا العام بعد، ننقص سنة
    If Date < DateSerial(Year(Date), Month(vBirth), Day(vBirth)) Then a = a - 1
    CalcAge = a
End Function

' تُستدعى من حدث AfterUpdate لحقل تاريخ الميلاد في فورم المريض:  =AgeUpdate()
Public Function AgeUpdate() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    f!Age = CalcAge(f!Birth_Date)
    AgeUpdate = Null
End Function


' ---------------------------------------------------------------------------
'  2) تحديد حالة النتيجة تلقائيًا
'     - لو النتيجة غير رقمية أو لا يوجد مدى رقمي => نُرجع "" (يبقى اختيار يدوي)
' ---------------------------------------------------------------------------
Public Function ResultStatus(vValue As Variant, vMin As Variant, vMax As Variant) As String
    ResultStatus = ""
    If IsNull(vValue) Then Exit Function
    If Not IsNumeric(vValue) Then Exit Function          ' نتيجة نصية => يدوي
    If IsNull(vMin) Or IsNull(vMax) Then Exit Function   ' لا يوجد مدى رقمي => يدوي

    Dim n As Double
    n = CDbl(vValue)
    If n < CDbl(vMin) Then
        ResultStatus = "منخفض"
    ElseIf n > CDbl(vMax) Then
        ResultStatus = "مرتفع"
    Else
        ResultStatus = "طبيعي"
    End If
End Function

' تُستدعى من حدث AfterUpdate لحقل النتيجة في الفورم الفرعي للنتائج:  =OnResultEntered()
Public Function OnResultEntered() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveControl.Parent          ' الفورم الفرعي (تفاصيل الطلب)
    Dim vMin As Variant, vMax As Variant
    vMin = DLookup("Normal_Range_Min", "Tests", "Test_ID=" & f!Test_ID)
    vMax = DLookup("Normal_Range_Max", "Tests", "Test_ID=" & f!Test_ID)

    Dim s As String
    s = ResultStatus(f!Result_Value, vMin, vMax)
    If Len(s) > 0 Then f!Result_Status = s        ' لو حدّدها آليًا نضعها
    If IsNull(f!Result_Date) Then f!Result_Date = Now()
    OnResultEntered = Null
End Function


' ---------------------------------------------------------------------------
'  3) نسخ سعر التحليل إلى Price_At_Order وقت اختياره
'     تُستدعى من حدث AfterUpdate لقائمة التحاليل في الفورم الفرعي:  =OnPickTest()
' ---------------------------------------------------------------------------
Public Function OnPickTest() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveControl.Parent          ' الفورم الفرعي
    If Not IsNull(f!Test_ID) Then
        f!Price_At_Order = Nz(DLookup("Price", "Tests", "Test_ID=" & f!Test_ID), 0)
    End If
    OnPickTest = Null
End Function


' ---------------------------------------------------------------------------
'  4) إعادة حساب إجمالي الطلب وتخزينه (يُستدعى عند الحفظ)
' ---------------------------------------------------------------------------
Public Sub RecalcOrderTotal(orderId As Long)
    Dim t As Currency
    t = Nz(DSum("Price_At_Order", "Order_Details", "Order_ID=" & orderId), 0)
    CurrentDb.Execute "UPDATE Orders SET Total_Price=" & t & _
                      " WHERE Order_ID=" & orderId, dbFailOnError
End Sub


' ---------------------------------------------------------------------------
'  5) قراءة إعدادات المعمل (اسم/عنوان/تليفون/مسؤول التوقيع) من tblSettings
' ---------------------------------------------------------------------------
Public Function GetSetting(fieldName As String) As String
    On Error Resume Next
    GetSetting = Nz(DLookup(fieldName, "tblSettings"), "")
End Function


' ---------------------------------------------------------------------------
'  6) أزرار التنقل بين الفورمات
'     مثال على زر:  خاصية On Click =  =Nav("frmPatient")
' ---------------------------------------------------------------------------
Public Function Nav(formName As String) As Variant
    On Error Resume Next
    DoCmd.OpenForm formName
    Nav = Null
End Function

' فتح فورم المريض من فورم الطلب لتسجيل مريض جديد بسرعة
Public Function NavNewPatient() As Variant
    On Error Resume Next
    DoCmd.OpenForm "frmPatient", , , , acFormAdd
    NavNewPatient = Null
End Function


' ---------------------------------------------------------------------------
'  7) حفظ السجل الحالي وتغيير حالة الطلب  (لأزرار: جاهز / مسلّم ...)
'     مثال:  =SetOrderStatus("جاهز")
' ---------------------------------------------------------------------------
Public Function SetOrderStatus(newStatus As String) As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If f.Dirty Then f.Dirty = False              ' يحفظ التعديلات أولًا
    f!Status = newStatus
    f.Dirty = False                              ' يحفظ الحالة الجديدة
    ' نحدّث الإجمالي المخزّن أيضًا
    If Not IsNull(f!Order_ID) Then RecalcOrderTotal CLng(f!Order_ID)
    MsgBox "تم الحفظ وتغيير حالة الطلب إلى: " & newStatus, vbInformation, "تم"
    SetOrderStatus = Null
End Function

' حفظ الطلب فقط (يحدّث الإجمالي المخزّن)  ->  =SaveOrder()
Public Function SaveOrder() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If f.Dirty Then f.Dirty = False
    If Not IsNull(f!Order_ID) Then RecalcOrderTotal CLng(f!Order_ID)
    SaveOrder = Null
End Function


' ---------------------------------------------------------------------------
'  8) الانتقال إلى طلب معيّن في فورم النتائج (من قائمة منسدلة cboPick)
'     خاصية AfterUpdate للقائمة:  =GoToOrder()
' ---------------------------------------------------------------------------
Public Function GoToOrder() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If Not IsNull(f!cboPick) Then
        f.Recordset.FindFirst "Order_ID=" & f!cboPick
    End If
    GoToOrder = Null
End Function


' ---------------------------------------------------------------------------
'  9) تصدير تقرير PDF (يُستخدم في المرحلة 3 بعد إنشاء التقارير)
'     يفتح التقرير مفلترًا على شرط ثم يحفظه PDF على سطح المكتب
' ---------------------------------------------------------------------------
Public Function ExportPDFReport(rpt As String, tag As String, whereClause As String) As Variant
    On Error GoTo H
    ' نفتح التقرير مخفيًا ومفلترًا على الطلب المطلوب
    DoCmd.OpenReport rpt, acViewPreview, , whereClause, acHidden
    Dim p As String
    p = DesktopPath() & rpt & "_" & CleanName(tag) & "_" & Format(Now, "yyyymmdd_hhnnss") & ".pdf"
    DoCmd.OutputTo acOutputReport, rpt, acFormatPDF, p, False
    DoCmd.Close acReport, rpt
    MsgBox "تم حفظ الملف على سطح المكتب:" & vbCrLf & p, vbInformation, "تم التصدير"
    ExportPDFReport = Null
    Exit Function
H:
    MsgBox "تعذّر التصدير. تأكد أن التقرير باسم '" & rpt & "' موجود." & vbCrLf & _
           "تفاصيل: " & Err.Description, vbExclamation, "خطأ التصدير"
End Function

' زر تصدير الفاتورة من فورم الطلب:  =DoInvoicePDF()
Public Function DoInvoicePDF() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If f.Dirty Then f.Dirty = False
    Dim tag As String
    tag = Nz(DLookup("Full_Name", "Patients", "Patient_ID=" & f!Patient_ID), "") & "_" & f!Order_ID
    ExportPDFReport "rptInvoice", tag, "Order_ID=" & f!Order_ID
    DoInvoicePDF = Null
End Function

' زر تصدير تقرير النتيجة من فورم النتائج:  =DoResultPDF()
Public Function DoResultPDF() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If f.Dirty Then f.Dirty = False
    Dim tag As String
    tag = Nz(DLookup("Full_Name", "Patients", "Patient_ID=" & f!Patient_ID), "") & "_" & f!Order_ID
    ExportPDFReport "rptResult", tag, "Order_ID=" & f!Order_ID
    DoResultPDF = Null
End Function


' ---------------------------------------------------------------------------
'  10) أزرار عامة للفورمات (حفظ / رجوع / سجل جديد)
' ---------------------------------------------------------------------------

' حفظ السجل الحالي في الفورم النشط  ->  =SaveCurrent()
Public Function SaveCurrent() As Variant
    On Error Resume Next
    ' تحقق بسيط: اسم المريض مطلوب في فورم المريض
    Dim f As Form
    Set f = Screen.ActiveForm
    If f.Name = "frmPatient" Then
        If Len(Nz(f!Full_Name, "")) = 0 Then
            MsgBox "اسم المريض مطلوب.", vbExclamation, "تنبيه"
            SaveCurrent = Null: Exit Function
        End If
        ' التليفون أرقام فقط (إن أُدخل)
        If Len(Nz(f!Phone, "")) > 0 And Not IsNumeric(f!Phone) Then
            MsgBox "رقم التليفون يجب أن يكون أرقامًا فقط.", vbExclamation, "تنبيه"
            SaveCurrent = Null: Exit Function
        End If
    End If
    If f.Dirty Then f.Dirty = False
    MsgBox "تم الحفظ.", vbInformation, "تم"
    SaveCurrent = Null
End Function

' إغلاق الفورم النشط والعودة  ->  =CloseMe()
Public Function CloseMe() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If f.Dirty Then f.Dirty = False
    DoCmd.Close acForm, f.Name
    CloseMe = Null
End Function

' الانتقال إلى سجل جديد فارغ في الفورم النشط  ->  =NavNewRecord()
Public Function NavNewRecord() As Variant
    On Error Resume Next
    DoCmd.GoToRecord , , acNewRec
    NavNewRecord = Null
End Function

' إعادة تحديث الفورم الفرعي في شاشة البحث  ->  =RequerySub()
Public Function RequerySub() As Variant
    On Error Resume Next
    Screen.ActiveForm!sfOrders.Requery
    RequerySub = Null
End Function

' تصدير نتيجة الطلب المحدد في شاشة البحث  ->  =ExportSelectedResult()
Public Function ExportSelectedResult() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm!sfOrders.Form         ' الفورم الفرعي للطلبات
    If IsNull(f!Order_ID) Then
        MsgBox "اختر طلبًا من القائمة أولًا (اضغط على صف الطلب).", vbExclamation
        ExportSelectedResult = Null: Exit Function
    End If
    Dim oid As Long: oid = CLng(f!Order_ID)
    Dim tag As String
    tag = Nz(DLookup("Full_Name", "Patients", "Patient_ID=" & _
          Nz(DLookup("Patient_ID", "Orders", "Order_ID=" & oid), 0)), "") & "_" & oid
    ExportPDFReport "rptResult", tag, "Order_ID=" & oid
    ExportSelectedResult = Null
End Function


' ---------------------------------------------------------------------------
'  دوال مساعدة صغيرة
' ---------------------------------------------------------------------------

' مسار سطح المكتب للمستخدم الحالي
Public Function DesktopPath() As String
    DesktopPath = Environ$("USERPROFILE") & "\Desktop\"
End Function

' تنظيف اسم الملف من الرموز الممنوعة في ويندوز
Public Function CleanName(s As String) As String
    Dim bad As Variant, ch As Variant, r As String
    r = Nz(s, "")
    bad = Array("\", "/", ":", "*", "?", """", "<", ">", "|")
    For Each ch In bad
        r = Replace(r, ch, "-")
    Next ch
    CleanName = Trim(r)
End Function

Option Compare Database
Option Explicit

' ============================================================================
'  basLab  -  Main logic module (English UI)
' ----------------------------------------------------------------------------
'  Status values used across the app:
'     Order.Status  : Registered / In Progress / Ready / Delivered
'     Result_Status : Normal / High / Low / Abnormal / Pending
'
'  Paste into a Module named "basLab".
' ============================================================================


' 1) Calculate age in years from birth date
Public Function CalcAge(vBirth As Variant) As Variant
    If IsNull(vBirth) Then CalcAge = Null: Exit Function
    If Not IsDate(vBirth) Then CalcAge = Null: Exit Function
    Dim a As Integer
    a = DateDiff("yyyy", vBirth, Date)
    If Date < DateSerial(Year(Date), Month(vBirth), Day(vBirth)) Then a = a - 1
    CalcAge = a
End Function

Public Function AgeUpdate() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    f!Age = CalcAge(f!Birth_Date)
    AgeUpdate = Null
End Function


' 2) Auto-determine result flag, matching the lab's printed format:
'    H = above the reference range, L = below it, blank = within range.
Public Function ResultStatus(vValue As Variant, vMin As Variant, vMax As Variant) As String
    ResultStatus = ""
    If IsNull(vValue) Then Exit Function
    If Not IsNumeric(vValue) Then Exit Function
    If IsNull(vMin) Or IsNull(vMax) Then Exit Function
    Dim n As Double
    n = CDbl(vValue)
    If n < CDbl(vMin) Then
        ResultStatus = "L"
    ElseIf n > CDbl(vMax) Then
        ResultStatus = "H"
    Else
        ResultStatus = "N"          ' normal (not printed on the report)
    End If
End Function

Public Function OnResultEntered() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveControl.Parent
    Dim vMin As Variant, vMax As Variant
    vMin = DLookup("Normal_Range_Min", "Tests", "Test_ID=" & f!Test_ID)
    vMax = DLookup("Normal_Range_Max", "Tests", "Test_ID=" & f!Test_ID)
    Dim s As String
    s = ResultStatus(f!Result_Value, vMin, vMax)
    If Len(s) > 0 Then f!Result_Status = s
    If IsNull(f!Result_Date) Then f!Result_Date = Now()
    OnResultEntered = Null
End Function


' 3) Copy the test price to Price_At_Order when a test is picked
Public Function OnPickTest() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveControl.Parent
    If Not IsNull(f!Test_ID) Then
        f!Price_At_Order = Nz(DLookup("Price", "Tests", "Test_ID=" & f!Test_ID), 0)
    End If
    OnPickTest = Null
End Function


' 4) Recalculate and store the order total
Public Sub RecalcOrderTotal(orderId As Long)
    Dim t As Currency
    t = Nz(DSum("Price_At_Order", "Order_Details", "Order_ID=" & orderId), 0)
    CurrentDb.Execute "UPDATE Orders SET Total_Price=" & t & _
                      " WHERE Order_ID=" & orderId, dbFailOnError
End Sub


' 5) Read a lab setting from tblSettings
Public Function GetSetting(fieldName As String) As String
    On Error Resume Next
    GetSetting = Nz(DLookup(fieldName, "tblSettings"), "")
End Function


' 6) Navigation between forms
Public Function Nav(formName As String) As Variant
    On Error Resume Next
    DoCmd.OpenForm formName
    Nav = Null
End Function

Public Function NavNewPatient() As Variant
    On Error Resume Next
    DoCmd.OpenForm "frmPatient", , , , acFormAdd
    NavNewPatient = Null
End Function


' 7) Save and change order status
Public Function SetOrderStatus(newStatus As String) As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If f.Dirty Then f.Dirty = False
    f!Status = newStatus
    f.Dirty = False
    If Not IsNull(f!Order_ID) Then RecalcOrderTotal CLng(f!Order_ID)
    MsgBox "Saved. Order status changed to: " & newStatus, vbInformation, "Done"
    SetOrderStatus = Null
End Function

Public Function SaveOrder() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If f.Dirty Then f.Dirty = False
    If Not IsNull(f!Order_ID) Then RecalcOrderTotal CLng(f!Order_ID)
    SaveOrder = Null
End Function


' 8) Jump to an order in the results form (from cboPick)
Public Function GoToOrder() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If Not IsNull(f!cboPick) Then
        f.Recordset.FindFirst "Order_ID=" & f!cboPick
    End If
    GoToOrder = Null
End Function


' 9) Export a report to PDF (filtered) onto the Desktop
Public Function ExportPDFReport(rpt As String, tag As String, whereClause As String) As Variant
    On Error GoTo H
    DoCmd.OpenReport rpt, acViewPreview, , whereClause, acHidden
    Dim p As String
    p = DesktopPath() & rpt & "_" & CleanName(tag) & "_" & Format(Now, "yyyymmdd_hhnnss") & ".pdf"
    DoCmd.OutputTo acOutputReport, rpt, acFormatPDF, p, False
    DoCmd.Close acReport, rpt
    MsgBox "PDF saved on the Desktop:" & vbCrLf & p, vbInformation, "Exported"
    ExportPDFReport = Null
    Exit Function
H:
    MsgBox "Could not export. Make sure the report '" & rpt & "' exists." & vbCrLf & _
           "Details: " & Err.Description, vbExclamation, "Export error"
End Function

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

Public Function DoDailyPDF() As Variant
    On Error Resume Next
    Dim d As String
    d = InputBox("Enter the day (yyyy/mm/dd):", "Daily report", Format(Date, "yyyy/mm/dd"))
    If Len(d) = 0 Then DoDailyPDF = Null: Exit Function
    Dim w As String
    w = "Order_Date>=#" & Format(CDate(d), "mm/dd/yyyy") & "# AND " & _
        "Order_Date<#" & Format(DateAdd("d", 1, CDate(d)), "mm/dd/yyyy") & "#"
    ExportPDFReport "rptDaily", "Daily_" & Replace(d, "/", "-"), w
    DoDailyPDF = Null
End Function


' 10) Generic form buttons (Save / Close / New)
Public Function SaveCurrent() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If f.Name = "frmPatient" Then
        If Len(Nz(f!Full_Name, "")) = 0 Then
            MsgBox "Patient name is required.", vbExclamation, "Notice"
            SaveCurrent = Null: Exit Function
        End If
        If Len(Nz(f!Phone, "")) > 0 And Not IsNumeric(f!Phone) Then
            MsgBox "Phone must be numbers only.", vbExclamation, "Notice"
            SaveCurrent = Null: Exit Function
        End If
    End If
    If f.Dirty Then f.Dirty = False
    MsgBox "Saved.", vbInformation, "Done"
    SaveCurrent = Null
End Function

Public Function CloseMe() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm
    If f.Dirty Then f.Dirty = False
    DoCmd.Close acForm, f.Name
    CloseMe = Null
End Function

Public Function NavNewRecord() As Variant
    On Error Resume Next
    DoCmd.GoToRecord , , acNewRec
    NavNewRecord = Null
End Function

Public Function RequerySub() As Variant
    On Error Resume Next
    Screen.ActiveForm!sfOrders.Requery
    RequerySub = Null
End Function

Public Function ExportSelectedResult() As Variant
    On Error Resume Next
    Dim f As Form
    Set f = Screen.ActiveForm!sfOrders.Form
    If IsNull(f!Order_ID) Then
        MsgBox "Select an order from the list first (click the order row).", vbExclamation
        ExportSelectedResult = Null: Exit Function
    End If
    Dim oid As Long: oid = CLng(f!Order_ID)
    Dim tag As String
    tag = Nz(DLookup("Full_Name", "Patients", "Patient_ID=" & _
          Nz(DLookup("Patient_ID", "Orders", "Order_ID=" & oid), 0)), "") & "_" & oid
    ExportPDFReport "rptResult", tag, "Order_ID=" & oid
    ExportSelectedResult = Null
End Function


' Small helpers
Public Function DesktopPath() As String
    DesktopPath = Environ$("USERPROFILE") & "\Desktop\"
End Function

Public Function CleanName(s As String) As String
    Dim bad As Variant, ch As Variant, r As String
    r = Nz(s, "")
    bad = Array("\", "/", ":", "*", "?", """", "<", ">", "|")
    For Each ch In bad
        r = Replace(r, ch, "-")
    Next ch
    CleanName = Trim(r)
End Function

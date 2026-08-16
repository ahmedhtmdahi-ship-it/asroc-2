Option Compare Database
Option Explicit

' Standard report sections (always present on a new report)
Private Const PH As Integer = 3     ' page header
Private Const DET As Integer = 0    ' detail
Private Const RF As Integer = 2     ' report footer
Private Const PF As Integer = 4     ' page footer

' ============================================================================
'  Medical Lab - Stage 3 : Build queries and reports (English UI)
' ----------------------------------------------------------------------------
'  Creates queries:  qryResult, qryInvoice, qryDaily
'  Creates reports:  rptResult, rptInvoice, rptDaily
'
'  Each report is always opened FILTERED to a single order by the PDF buttons,
'  so we use only the standard sections that always exist on a new report:
'     Page Header (3), Detail (0), Report Footer (2), Page Footer (4).
'  No group levels are used (they caused error 2148 on some Access builds).
'
'  Requires Stage 1 + 2 done, and module basLab present.
'  Run: type BuildAllReports in the Immediate window and press Enter.
' ============================================================================

Public Sub BuildAllReports()
    Dim log As String
    log = TryStep("qryResult", "MakeQryResult")
    log = log & TryStep("qryInvoice", "MakeQryInvoice")
    log = log & TryStep("qryDaily", "MakeQryDaily")
    log = log & TryStep("rptResult", "BuildRptResult")
    log = log & TryStep("rptInvoice", "BuildRptInvoice")
    log = log & TryStep("rptDaily", "BuildRptDaily")

    Application.RefreshDatabaseWindow
    MsgBox "Report build finished." & vbCrLf & vbCrLf & log & vbCrLf & _
           "Now try the PDF buttons on the Order and Results forms.", _
           vbInformation, "Build result"
End Sub

Private Function TryStep(objName As String, procName As String) As String
    On Error GoTo Fail
    DeleteObjIfExists objName
    Application.Run procName
    TryStep = "[OK]   " & objName & vbCrLf
    Exit Function
Fail:
    TryStep = "[FAIL] " & objName & "  ->  " & Err.Description & vbCrLf
End Function

Private Sub DeleteObjIfExists(objName As String)
    On Error Resume Next
    DoCmd.DeleteObject acQuery, objName
    DoCmd.DeleteObject acReport, objName
    On Error GoTo 0
End Sub


' ===========================================================================
'  Queries
' ===========================================================================
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

Public Sub MakeQryDaily()
    Dim sql As String
    sql = "SELECT o.Order_ID, o.Order_Date, p.Full_Name, o.Total_Price, o.Amount_Paid " & _
          "FROM Orders AS o INNER JOIN Patients AS p ON o.Patient_ID=p.Patient_ID " & _
          "ORDER BY o.Order_Date;"
    CurrentDb.CreateQueryDef "qryDaily", sql
End Sub


' ===========================================================================
'  Report helpers
' ===========================================================================
Private Function CM(ByVal cmVal As Double) As Long
    CM = CLng(cmVal * 567)
End Function

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

Private Sub RLine(rptName As String, sec As Integer, l As Double, t As Double, w As Double)
    ' الخطوط الأفقية ديكور فقط؛ لو رفضها الأكسس نتجاهلها بدل إيقاف البناء
    On Error Resume Next
    CreateReportControl rptName, acLine, sec, , "", CM(l), CM(t), CM(w), CM(0.02)
End Sub

Private Sub SaveReport(rpt As Report, finalName As String)
    Dim tmp As String
    tmp = rpt.Name
    DoCmd.Save acReport, tmp
    DoCmd.Close acReport, tmp, acSaveYes
    DoCmd.Rename finalName, acReport, tmp
End Sub


' ===========================================================================
'  Result report  rptResult   (always filtered to one order)
' ===========================================================================
Public Sub BuildRptResult()
    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryResult"

    ' Page header: lab info + patient info + column titles
    CreateReportControl rpt.Name, acImage, PH, , "", CM(0.5), CM(0.2), CM(3), CM(2.5)

    RBox rpt.Name, PH, "=GetSetting(""Lab_Name"")", 4, 0.2, 12, 0.8, True, 16
    RBox rpt.Name, PH, "=GetSetting(""Lab_Address"")", 4, 1#, 12, 0.6, False, 10
    RBox rpt.Name, PH, "=""Phone: "" & GetSetting(""Lab_Phone"")", 4, 1.6, 12, 0.6, False, 10

    RLbl rpt.Name, PH, "Test Result Report", 4, 2.4, 10, 0.8, True, 14
    RLine rpt.Name, PH, 0.5, 3.3, 19

    RBox rpt.Name, PH, "=""Name: "" & [Full_Name]", 0.5, 3.5, 7
    RBox rpt.Name, PH, "=""Age: "" & Nz([Age],"""")", 8, 3.5, 3
    RBox rpt.Name, PH, "=""Sex: "" & Nz([Gender],"""")", 11.5, 3.5, 3
    RBox rpt.Name, PH, "=""Order #: "" & [Order_ID]", 15, 3.5, 4

    RBox rpt.Name, PH, "=""Referred By: "" & Nz([Referring_Doctor],"""")", 0.5, 4.1, 7
    RBox rpt.Name, PH, "=""Order Date: "" & Format([Order_Date],""yyyy/mm/dd"")", 8, 4.1, 5
    RBox rpt.Name, PH, "=""Result Date: "" & Format(Nz([Result_Date],Now()),""yyyy/mm/dd"")", 13.5, 4.1, 5.5

    RLine rpt.Name, PH, 0.5, 4.9, 19
    RLbl rpt.Name, PH, "Test Name", 0.5, 5#, 6.5, 0.6, True
    RLbl rpt.Name, PH, "Result", 7, 5#, 3, 0.6, True
    RLbl rpt.Name, PH, "Unit", 10, 5#, 2.5, 0.6, True
    RLbl rpt.Name, PH, "Normal Range", 12.5, 5#, 3.5, 0.6, True
    RLbl rpt.Name, PH, "Status", 16, 5#, 3, 0.6, True
    rpt.Section(PH).Height = CM(5.8)

    ' Detail: one row per test
    RBox rpt.Name, DET, "=[Test_Name]", 0.5, 0.1, 6.5
    RBox rpt.Name, DET, "=[Result_Value]", 7, 0.1, 3
    RBox rpt.Name, DET, "=[Unit]", 10, 0.1, 2.5
    RBox rpt.Name, DET, "=[NRange]", 12.5, 0.1, 3.5
    RBox rpt.Name, DET, "=[Result_Status]", 16, 0.1, 3
    rpt.Section(DET).Height = CM(0.75)

    ' Report footer: signature
    RLine rpt.Name, RF, 0.5, 0.8, 5
    RBox rpt.Name, RF, "=""Signature: "" & GetSetting(""Signatory_Name"")", 0.5, 0.9, 8
    rpt.Section(RF).Height = CM(2#)

    ' Page footer: page number + note
    RBox rpt.Name, PF, "=""Page "" & [Page] & "" of "" & [Pages]", 0.5, 0.2, 4
    RLbl rpt.Name, PF, "This report is for medical purposes only", 8, 0.2, 9
    rpt.Section(PF).Height = CM(1)

    SaveReport rpt, "rptResult"
End Sub


' ===========================================================================
'  Invoice  rptInvoice   (always filtered to one order)
' ===========================================================================
Public Sub BuildRptInvoice()
    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryInvoice"

    RBox rpt.Name, PH, "=GetSetting(""Lab_Name"")", 4, 0.2, 15, 0.8, True, 16
    RBox rpt.Name, PH, "=GetSetting(""Lab_Address"")", 4, 1#, 15, 0.6, False, 10
    RBox rpt.Name, PH, "=""Phone: "" & GetSetting(""Lab_Phone"")", 4, 1.6, 15, 0.6, False, 10
    RLbl rpt.Name, PH, "Invoice / Receipt", 4, 2.4, 10, 0.8, True, 14
    RLine rpt.Name, PH, 0.5, 3.3, 19

    RBox rpt.Name, PH, "=""Name: "" & [Full_Name]", 0.5, 3.5, 7
    RBox rpt.Name, PH, "=""Order #: "" & [Order_ID]", 8, 3.5, 4
    RBox rpt.Name, PH, "=""Date: "" & Format([Order_Date],""yyyy/mm/dd"")", 12.5, 3.5, 5

    RLine rpt.Name, PH, 0.5, 4.3, 19
    RLbl rpt.Name, PH, "Test Name", 0.5, 4.4, 12, 0.6, True
    RLbl rpt.Name, PH, "Price", 13, 4.4, 4, 0.6, True
    rpt.Section(PH).Height = CM(5.2)

    RBox rpt.Name, DET, "=[Test_Name]", 0.5, 0.1, 12
    RBox rpt.Name, DET, "=[Price_At_Order]", 13, 0.1, 4
    rpt.Section(DET).Height = CM(0.7)

    ' Report footer: totals (Sum works here)
    RLine rpt.Name, RF, 0.5, 0.1, 19
    RBox rpt.Name, RF, "=""Total: "" & Sum([Price_At_Order])", 0.5, 0.3, 7, 0.6, True
    RBox rpt.Name, RF, "=""Paid: "" & Nz(First([Amount_Paid]),0)", 0.5, 0.9, 7
    RBox rpt.Name, RF, "=""Remaining: "" & (Sum([Price_At_Order]) - Nz(First([Amount_Paid]),0))", 0.5, 1.5, 7, 0.6, True
    RBox rpt.Name, RF, "=""Expected pickup: "" & Format(DateAdd(""d"",1,First([Order_Date])),""yyyy/mm/dd"")", 9, 1.5, 8
    rpt.Section(RF).Height = CM(2.5)

    RBox rpt.Name, PF, "=""Page "" & [Page] & "" of "" & [Pages]", 0.5, 0.2, 4
    rpt.Section(PF).Height = CM(0.9)

    SaveReport rpt, "rptInvoice"
End Sub


' ===========================================================================
'  Daily report  rptDaily
' ===========================================================================
Public Sub BuildRptDaily()
    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryDaily"

    RBox rpt.Name, PH, "=GetSetting(""Lab_Name"") & "" - Daily Report""", 0.5, 0.2, 15, 0.8, True, 14
    RLine rpt.Name, PH, 0.5, 1.2, 19
    RLbl rpt.Name, PH, "Order #", 0.5, 1.3, 3, 0.6, True
    RLbl rpt.Name, PH, "Date", 3.5, 1.3, 4, 0.6, True
    RLbl rpt.Name, PH, "Patient", 7.5, 1.3, 7, 0.6, True
    RLbl rpt.Name, PH, "Total", 14.5, 1.3, 2.5, 0.6, True
    RLbl rpt.Name, PH, "Paid", 17, 1.3, 2.5, 0.6, True
    rpt.Section(PH).Height = CM(2)

    RBox rpt.Name, DET, "=[Order_ID]", 0.5, 0.1, 3
    RBox rpt.Name, DET, "=Format([Order_Date],""yyyy/mm/dd"")", 3.5, 0.1, 4
    RBox rpt.Name, DET, "=[Full_Name]", 7.5, 0.1, 7
    RBox rpt.Name, DET, "=[Total_Price]", 14.5, 0.1, 2.5
    RBox rpt.Name, DET, "=[Amount_Paid]", 17, 0.1, 2.5
    rpt.Section(DET).Height = CM(0.7)

    RLine rpt.Name, RF, 0.5, 0.1, 19
    RBox rpt.Name, RF, "=""Orders count: "" & Count([Order_ID])", 0.5, 0.3, 7, 0.6, True
    RBox rpt.Name, RF, "=""Total collected: "" & Sum([Amount_Paid])", 0.5, 0.9, 7, 0.6, True
    rpt.Section(RF).Height = CM(2)

    SaveReport rpt, "rptDaily"
End Sub

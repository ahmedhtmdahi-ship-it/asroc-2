Option Compare Database
Option Explicit

' Standard report sections (always present on a new report)
Private Const PH As Integer = 3     ' page header
Private Const DET As Integer = 0    ' detail
Private Const RF As Integer = 2     ' report footer
Private Const PF As Integer = 4     ' page footer

' ============================================================================
'  Medical Lab - Stage 3 : queries and reports
' ----------------------------------------------------------------------------
'  Queries:  qryResult, qryInvoice, qryDaily
'  Reports:  rptResult, rptInvoice, rptDaily
'
'  rptResult reproduces the lab's existing printed layout:
'    header  : Patient No. / Lab Code / Name / Referred By
'              Req. Date / Sex / Age / Reporting Date
'    title   : "<Category> Report"  (Chemistry / Hematology / Microbiology ...)
'    columns : Test | Result | Unit | Ref.Range
'    flag    : H or L printed after an out-of-range result, blank when normal
'    footer  : Test method, Comments, Branch Manager signature
'
'  The PDF buttons always open a report filtered to one order, so no group
'  levels are used (they raise error 2148 on some Access builds). Only the
'  standard sections above are used.
'
'  Requires: Stage 1 tables and module basLab.
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

' Flag: H above the range, L below it, blank inside it or non-numeric.
Public Sub MakeQryResult()
    Dim sql As String
    sql = "SELECT o.Order_ID, o.Order_Date, o.Reporting_Date, o.Patient_No, o.Lab_Code, " & _
          "o.Comments, p.Full_Name, p.Age, p.Gender, p.Referring_Doctor, " & _
          "t.Test_Name, t.Unit, t.Category, t.Test_Method, " & _
          "od.Result_Value, od.Result_Status, od.Result_Date, " & _
          "IIf(Len(Nz(t.Normal_Range_Text,''))>0, t.Normal_Range_Text, " & _
          "  IIf(IsNull(t.Normal_Range_Min),'', t.Normal_Range_Min & ' - ' & t.Normal_Range_Max)) AS NRange, " & _
          "IIf(IsNumeric(od.Result_Value) And Not IsNull(t.Normal_Range_Min) And Not IsNull(t.Normal_Range_Max), " & _
          "  IIf(CDbl(Nz(od.Result_Value,0))>t.Normal_Range_Max,'H', " & _
          "    IIf(CDbl(Nz(od.Result_Value,0))<t.Normal_Range_Min,'L','')), '') AS Flag " & _
          "FROM ((Orders AS o INNER JOIN Patients AS p ON o.Patient_ID=p.Patient_ID) " & _
          "INNER JOIN Order_Details AS od ON o.Order_ID=od.Order_ID) " & _
          "INNER JOIN Tests AS t ON od.Test_ID=t.Test_ID " & _
          "ORDER BY o.Order_ID, t.Category, t.Test_Name;"
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
                      l As Double, t As Double, w As Double, Optional h As Double = 0.55, _
                      Optional bold As Boolean = False, Optional fs As Integer = 10) As Control
    Dim c As Control
    Set c = CreateReportControl(rptName, acLabel, sec, , "", CM(l), CM(t), CM(w), CM(h))
    c.Caption = cap
    c.FontSize = fs
    c.FontWeight = IIf(bold, 700, 400)
    Set RLbl = c
End Function

Private Function RBox(rptName As String, sec As Integer, src As String, _
                      l As Double, t As Double, w As Double, Optional h As Double = 0.55, _
                      Optional bold As Boolean = False, Optional fs As Integer = 10) As Control
    Dim c As Control
    Set c = CreateReportControl(rptName, acTextBox, sec, , "", CM(l), CM(t), CM(w), CM(h))
    c.ControlSource = src
    c.FontSize = fs
    c.FontWeight = IIf(bold, 700, 400)
    Set RBox = c
End Function

' Separator lines are decorative; some Access builds reject acLine, so a
' failure here is ignored rather than aborting the whole report build.
Private Sub RLine(rptName As String, sec As Integer, l As Double, t As Double, w As Double)
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
'  Result report - matches the lab's existing printed layout
' ===========================================================================
Public Sub BuildRptResult()
    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryResult"

    ' ---- letterhead ----
    CreateReportControl rpt.Name, acImage, PH, , "", CM(0.5), CM(0.2), CM(3.5), CM(2.2)
    RBox rpt.Name, PH, "=GetSetting(""Lab_Name"")", 4.5, 0.2, 9, 0.8, True, 15
    RBox rpt.Name, PH, "=GetSetting(""Lab_Address"")", 4.5, 1#, 9, 0.5, False, 9
    RBox rpt.Name, PH, "=""Tel: "" & GetSetting(""Lab_Phone"")", 4.5, 1.5, 9, 0.5, False, 9

    ' ---- patient block, left column ----
    RLbl rpt.Name, PH, "Patient No.", 0.5, 2.5, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Nz([Patient_No],[Order_ID])", 3.2, 2.5, 4
    RLbl rpt.Name, PH, "Lab Code", 0.5, 3#, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Nz([Lab_Code],"""")", 3.2, 3#, 4
    RLbl rpt.Name, PH, "Name", 0.5, 3.5, 2.6, 0.5, True
    RBox rpt.Name, PH, "=[Full_Name]", 3.2, 3.5, 4
    RLbl rpt.Name, PH, "Referred By", 0.5, 4#, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Nz([Referring_Doctor],"""")", 3.2, 4#, 4

    ' ---- patient block, right column ----
    RLbl rpt.Name, PH, "Req. Date", 9.5, 2.5, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Format([Order_Date],""dd-mm-yyyy hh:nn"")", 12.2, 2.5, 4.5
    RLbl rpt.Name, PH, "Sex", 9.5, 3#, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Nz([Gender],"""")", 12.2, 3#, 4.5
    RLbl rpt.Name, PH, "Age", 9.5, 3.5, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Nz([Age],"""") & "" Y""", 12.2, 3.5, 4.5
    RLbl rpt.Name, PH, "Reporting Date", 9.5, 4#, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Format(Nz([Reporting_Date],Now()),""dd-mm-yyyy hh:nn"")", 12.2, 4#, 4.5

    ' ---- title driven by the test category ----
    RBox rpt.Name, PH, "=Nz([Category],""Lab"") & "" Report""", 5.5, 4.8, 8, 0.8, True, 14

    ' ---- column headers ----
    RLine rpt.Name, PH, 0.5, 5.7, 16.5
    RLbl rpt.Name, PH, "Test", 0.5, 5.8, 6.5, 0.55, True
    RLbl rpt.Name, PH, "Result", 7.2, 5.8, 3.5, 0.55, True
    RLbl rpt.Name, PH, "Unit", 10.9, 5.8, 2.5, 0.55, True
    RLbl rpt.Name, PH, "Ref.Range", 13.6, 5.8, 3.4, 0.55, True
    RLine rpt.Name, PH, 0.5, 6.35, 16.5
    rpt.Section(PH).Height = CM(6.5)

    ' ---- detail: result followed by the H/L flag ----
    RBox rpt.Name, DET, "=[Test_Name]", 0.5, 0.1, 6.5
    RBox rpt.Name, DET, "=[Result_Value] & ""   "" & [Flag]", 7.2, 0.1, 3.5, 0.55, True
    RBox rpt.Name, DET, "=[Unit]", 10.9, 0.1, 2.5
    RBox rpt.Name, DET, "=[NRange]", 13.6, 0.1, 3.4
    rpt.Section(DET).Height = CM(0.7)

    ' ---- footer: method, comments, signature ----
    RLine rpt.Name, RF, 0.5, 0.1, 16.5
    RBox rpt.Name, RF, "=IIf(Len(Nz([Test_Method],""""))>0, ""Test method: "" & [Test_Method], """")", _
         0.5, 0.3, 8, 0.5, False, 9
    RLbl rpt.Name, RF, "Comments :", 0.5, 1#, 3, 0.5, True
    RBox rpt.Name, RF, "=Nz([Comments],"""")", 0.5, 1.5, 12, 1.4, False, 9
    RLine rpt.Name, RF, 12.5, 3.2, 4.5
    RBox rpt.Name, RF, "=GetSetting(""Signatory_Name"")", 12.5, 3.3, 4.5, 0.5, True
    RLbl rpt.Name, RF, "Branch Manager", 12.5, 3.8, 4.5, 0.5, False, 9
    rpt.Section(RF).Height = CM(4.5)

    RBox rpt.Name, PF, "=""Page "" & [Page] & "" of "" & [Pages]", 0.5, 0.2, 4, 0.5, False, 9
    RLbl rpt.Name, PF, "This report is for medical purposes only", 8, 0.2, 9, 0.5, False, 9
    rpt.Section(PF).Height = CM(0.9)

    SaveReport rpt, "rptResult"
End Sub


' ===========================================================================
'  Invoice - always filtered to one order
' ===========================================================================
Public Sub BuildRptInvoice()
    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryInvoice"

    RBox rpt.Name, PH, "=GetSetting(""Lab_Name"")", 4, 0.2, 12, 0.8, True, 15
    RBox rpt.Name, PH, "=GetSetting(""Lab_Address"")", 4, 1#, 12, 0.5, False, 9
    RBox rpt.Name, PH, "=""Tel: "" & GetSetting(""Lab_Phone"")", 4, 1.5, 12, 0.5, False, 9
    RLbl rpt.Name, PH, "Invoice / Receipt", 4, 2.2, 10, 0.8, True, 14
    RLine rpt.Name, PH, 0.5, 3.1, 16.5

    RBox rpt.Name, PH, "=""Name: "" & [Full_Name]", 0.5, 3.3, 7
    RBox rpt.Name, PH, "=""Order #: "" & [Order_ID]", 8, 3.3, 4
    RBox rpt.Name, PH, "=""Date: "" & Format([Order_Date],""dd-mm-yyyy"")", 12.2, 3.3, 4.8

    RLine rpt.Name, PH, 0.5, 4.1, 16.5
    RLbl rpt.Name, PH, "Test Name", 0.5, 4.2, 12, 0.55, True
    RLbl rpt.Name, PH, "Price", 13, 4.2, 4, 0.55, True
    rpt.Section(PH).Height = CM(4.9)

    RBox rpt.Name, DET, "=[Test_Name]", 0.5, 0.1, 12
    RBox rpt.Name, DET, "=[Price_At_Order]", 13, 0.1, 4
    rpt.Section(DET).Height = CM(0.7)

    ' Sum() is valid in the report footer
    RLine rpt.Name, RF, 0.5, 0.1, 16.5
    RBox rpt.Name, RF, "=""Total: "" & Sum([Price_At_Order])", 0.5, 0.3, 7, 0.55, True
    RBox rpt.Name, RF, "=""Paid: "" & Nz(First([Amount_Paid]),0)", 0.5, 0.9, 7
    RBox rpt.Name, RF, "=""Remaining: "" & (Sum([Price_At_Order]) - Nz(First([Amount_Paid]),0))", 0.5, 1.5, 7, 0.55, True
    RBox rpt.Name, RF, "=""Expected pickup: "" & Format(DateAdd(""d"",1,First([Order_Date])),""dd-mm-yyyy"")", 9, 1.5, 8
    rpt.Section(RF).Height = CM(2.5)

    RBox rpt.Name, PF, "=""Page "" & [Page] & "" of "" & [Pages]", 0.5, 0.2, 4, 0.5, False, 9
    rpt.Section(PF).Height = CM(0.9)

    SaveReport rpt, "rptInvoice"
End Sub


' ===========================================================================
'  Daily report - filtered to one day by DoDailyPDF
' ===========================================================================
Public Sub BuildRptDaily()
    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryDaily"

    RBox rpt.Name, PH, "=GetSetting(""Lab_Name"") & "" - Daily Report""", 0.5, 0.2, 15, 0.8, True, 14
    RLine rpt.Name, PH, 0.5, 1.2, 16.5
    RLbl rpt.Name, PH, "Order #", 0.5, 1.3, 3, 0.55, True
    RLbl rpt.Name, PH, "Date", 3.5, 1.3, 4, 0.55, True
    RLbl rpt.Name, PH, "Patient", 7.5, 1.3, 6, 0.55, True
    RLbl rpt.Name, PH, "Total", 13.5, 1.3, 2, 0.55, True
    RLbl rpt.Name, PH, "Paid", 15.5, 1.3, 2, 0.55, True
    rpt.Section(PH).Height = CM(2)

    RBox rpt.Name, DET, "=[Order_ID]", 0.5, 0.1, 3
    RBox rpt.Name, DET, "=Format([Order_Date],""dd-mm-yyyy"")", 3.5, 0.1, 4
    RBox rpt.Name, DET, "=[Full_Name]", 7.5, 0.1, 6
    RBox rpt.Name, DET, "=[Total_Price]", 13.5, 0.1, 2
    RBox rpt.Name, DET, "=[Amount_Paid]", 15.5, 0.1, 2
    rpt.Section(DET).Height = CM(0.7)

    RLine rpt.Name, RF, 0.5, 0.1, 16.5
    RBox rpt.Name, RF, "=""Orders count: "" & Count([Order_ID])", 0.5, 0.3, 7, 0.55, True
    RBox rpt.Name, RF, "=""Total collected: "" & Sum([Amount_Paid])", 0.5, 0.9, 7, 0.55, True
    rpt.Section(RF).Height = CM(2)

    SaveReport rpt, "rptDaily"
End Sub

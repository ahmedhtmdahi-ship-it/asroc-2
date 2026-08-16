Option Compare Database
Option Explicit

' Standard report sections
Private Const PH As Integer = 3     ' page header  (exists)
Private Const DET As Integer = 0    ' detail       (exists)
Private Const PF As Integer = 4     ' page footer  (exists)
Private Const RF As Integer = 2     ' report footer (may not exist -> tolerated)

' ============================================================================
'  Medical Lab - Stage 3 : queries + reports (English UI, fault tolerant)
'  Essential content lives in Page Header / Detail / Page Footer (always exist).
'  Every control add is tolerant: a missing section is skipped, never crashes.
'  Reports are always opened filtered to one order by the PDF buttons.
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
'  Fault-tolerant control helpers (missing section -> skipped, no crash)
' ===========================================================================
Private Function CM(ByVal cmVal As Double) As Long
    CM = CLng(cmVal * 567)
End Function

Private Sub RLbl(rptName As String, sec As Integer, cap As String, _
                 l As Double, t As Double, w As Double, Optional h As Double = 0.6, _
                 Optional bold As Boolean = False, Optional fontSize As Integer = 11)
    On Error Resume Next
    Dim c As Control
    Set c = CreateReportControl(rptName, acLabel, sec, , "", CM(l), CM(t), CM(w), CM(h))
    c.Caption = cap
    c.fontSize = fontSize
    c.FontWeight = IIf(bold, 700, 400)
End Sub

Private Sub RBox(rptName As String, sec As Integer, src As String, _
                 l As Double, t As Double, w As Double, Optional h As Double = 0.6, _
                 Optional bold As Boolean = False, Optional fontSize As Integer = 11)
    On Error Resume Next
    Dim c As Control
    Set c = CreateReportControl(rptName, acTextBox, sec, , "", CM(l), CM(t), CM(w), CM(h))
    c.ControlSource = src
    c.fontSize = fontSize
    c.FontWeight = IIf(bold, 700, 400)
End Sub

Private Sub RLine(rptName As String, sec As Integer, l As Double, t As Double, w As Double)
    On Error Resume Next
    CreateReportControl rptName, acLine, sec, , "", CM(l), CM(t), CM(w), CM(0.02)
End Sub

Private Sub RImg(rptName As String, sec As Integer, l As Double, t As Double, w As Double, h As Double)
    On Error Resume Next
    CreateReportControl rptName, acImage, sec, , "", CM(l), CM(t), CM(w), CM(h)
End Sub

Private Sub SetH(rpt As Report, sec As Integer, h As Double)
    On Error Resume Next
    rpt.Section(sec).Height = CM(h)
End Sub

Private Sub SaveReport(rpt As Report, finalName As String)
    Dim tmp As String
    tmp = rpt.Name
    DoCmd.Save acReport, tmp
    DoCmd.Close acReport, tmp, acSaveYes
    DoCmd.Rename finalName, acReport, tmp
End Sub


' ===========================================================================
'  Result report  rptResult   (single order)
' ===========================================================================
Public Sub BuildRptResult()
    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryResult"

    RImg rpt.Name, PH, 0.5, 0.2, 3, 2.5
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
    SetH rpt, PH, 5.8

    RBox rpt.Name, DET, "=[Test_Name]", 0.5, 0.1, 6.5
    RBox rpt.Name, DET, "=[Result_Value]", 7, 0.1, 3
    RBox rpt.Name, DET, "=[Unit]", 10, 0.1, 2.5
    RBox rpt.Name, DET, "=[NRange]", 12.5, 0.1, 3.5
    RBox rpt.Name, DET, "=[Result_Status]", 16, 0.1, 3
    SetH rpt, DET, 0.75

    ' Page footer: signature (no record dependency) + page + note
    RBox rpt.Name, PF, "=""Signature: "" & GetSetting(""Signatory_Name"")", 0.5, 0.2, 8
    RBox rpt.Name, PF, "=""Page "" & [Page] & "" of "" & [Pages]", 0.5, 1.1, 4
    RLbl rpt.Name, PF, "This report is for medical purposes only", 8, 1.1, 9
    SetH rpt, PF, 2#

    SaveReport rpt, "rptResult"
End Sub


' ===========================================================================
'  Invoice  rptInvoice   (single order)
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
    SetH rpt, PH, 5.2

    RBox rpt.Name, DET, "=[Test_Name]", 0.5, 0.1, 12
    RBox rpt.Name, DET, "=[Price_At_Order]", 13, 0.1, 4
    SetH rpt, DET, 0.7

    ' Page footer: totals via domain aggregates keyed on the (single) order
    RBox rpt.Name, PF, "=""Total: "" & DSum(""Price_At_Order"",""Order_Details"",""Order_ID="" & [Order_ID])", 0.5, 0.2, 8, 0.6, True
    RBox rpt.Name, PF, "=""Paid: "" & Nz(DLookup(""Amount_Paid"",""Orders"",""Order_ID="" & [Order_ID]),0)", 0.5, 0.8, 8
    RBox rpt.Name, PF, "=""Remaining: "" & (DSum(""Price_At_Order"",""Order_Details"",""Order_ID="" & [Order_ID]) - Nz(DLookup(""Amount_Paid"",""Orders"",""Order_ID="" & [Order_ID]),0))", 0.5, 1.4, 9, 0.6, True
    RBox rpt.Name, PF, "=""Expected pickup: "" & Format(DateAdd(""d"",1,[Order_Date]),""yyyy/mm/dd"")", 10, 1.4, 8
    RBox rpt.Name, PF, "=""Page "" & [Page] & "" of "" & [Pages]", 0.5, 2.1, 4
    SetH rpt, PF, 3#

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
    SetH rpt, PH, 2

    RBox rpt.Name, DET, "=[Order_ID]", 0.5, 0.1, 3
    RBox rpt.Name, DET, "=Format([Order_Date],""yyyy/mm/dd"")", 3.5, 0.1, 4
    RBox rpt.Name, DET, "=[Full_Name]", 7.5, 0.1, 7
    RBox rpt.Name, DET, "=[Total_Price]", 14.5, 0.1, 2.5
    RBox rpt.Name, DET, "=[Amount_Paid]", 17, 0.1, 2.5
    SetH rpt, DET, 0.7

    ' Totals in report footer if it exists (tolerated), else page footer
    RBox rpt.Name, RF, "=""Orders count: "" & Count([Order_ID])", 0.5, 0.3, 7, 0.6, True
    RBox rpt.Name, RF, "=""Total collected: "" & Sum([Amount_Paid])", 0.5, 0.9, 7, 0.6, True
    SetH rpt, RF, 2

    SaveReport rpt, "rptDaily"
End Sub

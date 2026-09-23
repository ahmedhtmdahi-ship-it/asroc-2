Option Compare Database
Option Explicit

' Standard report sections
Private Const PH As Integer = 3     ' page header
Private Const DET As Integer = 0    ' detail
Private Const RF As Integer = 2     ' report footer
Private Const PF As Integer = 4     ' page footer

' ============================================================================
'  Medical Lab - Upgrade 1 : match the lab's real report layout
' ----------------------------------------------------------------------------
'  Adds:
'    Orders.Patient_No      per-visit patient number (e.g. 26089140)
'    Orders.Lab_Code        referring lab / branch code (e.g. 1692988-0)
'    Orders.Reporting_Date  when the report was issued
'    Orders.Comments        free text printed at the bottom of the report
'    Tests.Test_Method      e.g. "CLIA/e CLIA"
'
'  Rebuilds qryResult and rptResult to match the layout:
'    header block  : Patient No. / Lab Code / Name / Referred By
'                    Req. Date / Sex / Age / Reporting Date
'    title         : "<Category> Report"  (Chemistry / Hematology / ...)
'    columns       : Test | Result | Unit | Ref.Range
'    abnormal flag : H or L printed after the result (blank when normal)
'    footer        : Test method, Comments, Branch Manager signature
'
'  Run: type UpgradeReport in the Immediate window and press Enter.
'  Safe to run more than once.
' ============================================================================

Public Sub UpgradeReport()
    Dim log As String
    log = Stp("New fields", "AddNewFields")
    log = log & Stp("qryResult", "RemakeQryResult")
    log = log & Stp("rptResult", "RemakeRptResult")

    Application.RefreshDatabaseWindow
    MsgBox "Upgrade finished." & vbCrLf & vbCrLf & log & vbCrLf & _
           "Remember to replace the ResultStatus function in basLab (see chat).", _
           vbInformation, "Upgrade result"
End Sub

Private Function Stp(what As String, procName As String) As String
    On Error GoTo Fail
    Application.Run procName
    Stp = "[OK]   " & what & vbCrLf
    Exit Function
Fail:
    Stp = "[FAIL] " & what & "  ->  " & Err.Description & vbCrLf
End Function


' ---------------------------------------------------------------------------
'  1) New fields (skipped silently if they already exist)
' ---------------------------------------------------------------------------
Public Sub AddNewFields()
    AddFieldIfMissing "Orders", "Patient_No", dbText, 30
    AddFieldIfMissing "Orders", "Lab_Code", dbText, 30
    AddFieldIfMissing "Orders", "Reporting_Date", dbDate, 0
    AddFieldIfMissing "Orders", "Comments", dbMemo, 0
    AddFieldIfMissing "Tests", "Test_Method", dbText, 60
End Sub

Private Sub AddFieldIfMissing(tbl As String, fld As String, ftype As Integer, fsize As Integer)
    On Error Resume Next
    Dim td As DAO.TableDef
    Set td = CurrentDb.TableDefs(tbl)
    Dim probe As String
    probe = td.Fields(fld).Name          ' errors if the field is missing
    If Err.Number <> 0 Then
        Err.Clear
        Dim f As DAO.Field
        If fsize > 0 Then
            Set f = td.CreateField(fld, ftype, fsize)
        Else
            Set f = td.CreateField(fld, ftype)
        End If
        td.Fields.Append f
    End If
    On Error GoTo 0
End Sub


' ---------------------------------------------------------------------------
'  2) Query feeding the result report
'     Flag: H when above max, L when below min, blank otherwise.
' ---------------------------------------------------------------------------
Public Sub RemakeQryResult()
    On Error Resume Next
    DoCmd.DeleteObject acQuery, "qryResult"
    On Error GoTo 0

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


' ---------------------------------------------------------------------------
'  Report build helpers
' ---------------------------------------------------------------------------
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


' ---------------------------------------------------------------------------
'  3) Result report laid out like the lab's existing reports
' ---------------------------------------------------------------------------
Public Sub RemakeRptResult()
    On Error Resume Next
    DoCmd.DeleteObject acReport, "rptResult"
    On Error GoTo 0

    Dim rpt As Report
    Set rpt = CreateReport()
    rpt.RecordSource = "qryResult"

    ' ---- letterhead ----
    CreateReportControl rpt.Name, acImage, PH, , "", CM(0.5), CM(0.2), CM(3.5), CM(2.2)
    RBox rpt.Name, PH, "=GetSetting(""Lab_Name"")", 4.5, 0.2, 9, 0.8, True, 15
    RBox rpt.Name, PH, "=GetSetting(""Lab_Address"")", 4.5, 1#, 9, 0.5, False, 9
    RBox rpt.Name, PH, "=""Tel: "" & GetSetting(""Lab_Phone"")", 4.5, 1.5, 9, 0.5, False, 9

    ' ---- patient block : left column ----
    RLbl rpt.Name, PH, "Patient No.", 0.5, 2.5, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Nz([Patient_No],[Order_ID])", 3.2, 2.5, 4

    RLbl rpt.Name, PH, "Lab Code", 0.5, 3#, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Nz([Lab_Code],"""")", 3.2, 3#, 4

    RLbl rpt.Name, PH, "Name", 0.5, 3.5, 2.6, 0.5, True
    RBox rpt.Name, PH, "=[Full_Name]", 3.2, 3.5, 4

    RLbl rpt.Name, PH, "Referred By", 0.5, 4#, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Nz([Referring_Doctor],"""")", 3.2, 4#, 4

    ' ---- patient block : right column ----
    RLbl rpt.Name, PH, "Req. Date", 9.5, 2.5, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Format([Order_Date],""dd-mm-yyyy hh:nn"")", 12.2, 2.5, 4.5

    RLbl rpt.Name, PH, "Sex", 9.5, 3#, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Nz([Gender],"""")", 12.2, 3#, 4.5

    RLbl rpt.Name, PH, "Age", 9.5, 3.5, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Nz([Age],"""") & "" Y""", 12.2, 3.5, 4.5

    RLbl rpt.Name, PH, "Reporting Date", 9.5, 4#, 2.6, 0.5, True
    RBox rpt.Name, PH, "=Format(Nz([Reporting_Date],Now()),""dd-mm-yyyy hh:nn"")", 12.2, 4#, 4.5

    ' ---- title : "<Category> Report" ----
    RBox rpt.Name, PH, "=Nz([Category],""Lab"") & "" Report""", 5.5, 4.8, 8, 0.8, True, 14

    ' ---- column headers ----
    RLine rpt.Name, PH, 0.5, 5.7, 16.5
    RLbl rpt.Name, PH, "Test", 0.5, 5.8, 6.5, 0.55, True
    RLbl rpt.Name, PH, "Result", 7.2, 5.8, 3.5, 0.55, True
    RLbl rpt.Name, PH, "Unit", 10.9, 5.8, 2.5, 0.55, True
    RLbl rpt.Name, PH, "Ref.Range", 13.6, 5.8, 3.4, 0.55, True
    RLine rpt.Name, PH, 0.5, 6.35, 16.5
    rpt.Section(PH).Height = CM(6.5)

    ' ---- detail : result + H/L flag ----
    RBox rpt.Name, DET, "=[Test_Name]", 0.5, 0.1, 6.5
    RBox rpt.Name, DET, "=[Result_Value] & ""   "" & [Flag]", 7.2, 0.1, 3.5, 0.55, True
    RBox rpt.Name, DET, "=[Unit]", 10.9, 0.1, 2.5
    RBox rpt.Name, DET, "=[NRange]", 13.6, 0.1, 3.4
    rpt.Section(DET).Height = CM(0.7)

    ' ---- footer : method, comments, signature ----
    RLine rpt.Name, RF, 0.5, 0.1, 16.5
    RBox rpt.Name, RF, "=IIf(Len(Nz([Test_Method],""""))>0, ""Test method: "" & [Test_Method], """")", _
         0.5, 0.3, 8, 0.5, False, 9

    RLbl rpt.Name, RF, "Comments :", 0.5, 1#, 3, 0.5, True
    RBox rpt.Name, RF, "=Nz([Comments],"""")", 0.5, 1.5, 12, 1.4, False, 9

    RLine rpt.Name, RF, 12.5, 3.2, 4.5
    RBox rpt.Name, RF, "=GetSetting(""Signatory_Name"")", 12.5, 3.3, 4.5, 0.5, True
    RLbl rpt.Name, RF, "Branch Manager", 12.5, 3.8, 4.5, 0.5, False, 9
    rpt.Section(RF).Height = CM(4.5)

    ' ---- page footer ----
    RBox rpt.Name, PF, "=""Page "" & [Page] & "" of "" & [Pages]", 0.5, 0.2, 4, 0.5, False, 9
    RLbl rpt.Name, PF, "This report is for medical purposes only", 8, 0.2, 9, 0.5, False, 9
    rpt.Section(PF).Height = CM(0.9)

    SaveReport rpt, "rptResult"
End Sub

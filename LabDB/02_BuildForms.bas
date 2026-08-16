Option Compare Database
Option Explicit

' ============================================================================
'  Medical Lab - Stage 2 : Build all forms automatically (English UI, LTR)
' ----------------------------------------------------------------------------
'  Builds: frmMain, frmPatient, frmTests,
'          frmOrder + sfrmOrderDetails,
'          frmResults + sfrmResults,
'          frmSearch + sfrmSearch
'
'  Requires: Stage 1 tables exist, and module basLab is pasted.
'  Run: put the cursor in BuildAllForms and press F5
'       (or type BuildAllForms in the Immediate window and press Enter).
'
'  Each form is built with its own error handling; if one fails the rest
'  continue and the summary tells you which failed.
' ============================================================================

Public Sub BuildAllForms()
    Dim log As String
    log = TryBuild("frmMain", "BuildMain")
    log = log & TryBuild("frmPatient", "BuildPatient")
    log = log & TryBuild("frmTests", "BuildTests")
    log = log & TryBuild("sfrmOrderDetails", "BuildOrderSub")
    log = log & TryBuild("frmOrder", "BuildOrder")
    log = log & TryBuild("sfrmResults", "BuildResultsSub")
    log = log & TryBuild("frmResults", "BuildResults")
    log = log & TryBuild("sfrmSearch", "BuildSearchSub")
    log = log & TryBuild("frmSearch", "BuildSearch")

    SetStartupForm "frmMain"
    Application.RefreshDatabaseWindow

    MsgBox "Form build finished." & vbCrLf & vbCrLf & log & vbCrLf & _
           "frmMain is set to open on startup (after you close and reopen the file).", _
           vbInformation, "Build result"
End Sub

Private Function TryBuild(formName As String, procName As String) As String
    On Error GoTo Fail
    DeleteFormIfExists formName
    Application.Run procName
    TryBuild = "[OK]   " & formName & vbCrLf
    Exit Function
Fail:
    TryBuild = "[FAIL] " & formName & "  ->  " & Err.Description & vbCrLf
End Function


' ===========================================================================
'  Build helpers
' ===========================================================================

Private Function CM(ByVal cmVal As Double) As Long
    CM = CLng(cmVal * 567)          ' centimeters -> twips
End Function

Private Function AddLabel(frmName As String, cap As String, _
                          l As Double, t As Double, w As Double, Optional h As Double = 0.6) As Control
    Dim c As Control
    Set c = CreateControl(frmName, acLabel, acDetail, , "", CM(l), CM(t), CM(w), CM(h))
    c.Caption = cap
    Set AddLabel = c
End Function

Private Function AddBox(frmName As String, fieldName As String, _
                        l As Double, t As Double, w As Double, Optional h As Double = 0.6) As Control
    Dim c As Control
    Set c = CreateControl(frmName, acTextBox, acDetail, , fieldName, CM(l), CM(t), CM(w), CM(h))
    c.Name = "txt" & fieldName
    Set AddBox = c
End Function

Private Function AddBtn(frmName As String, cap As String, onClickExpr As String, _
                        l As Double, t As Double, w As Double, Optional h As Double = 0.8) As Control
    Dim c As Control
    Set c = CreateControl(frmName, acCommandButton, acDetail, , "", CM(l), CM(t), CM(w), CM(h))
    c.Caption = cap
    c.OnClick = onClickExpr
    Set AddBtn = c
End Function

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

Private Sub SaveForm(frm As Form, finalName As String)
    Dim tmp As String
    tmp = frm.Name
    DoCmd.Save acForm, tmp
    DoCmd.Close acForm, tmp, acSaveYes
    DoCmd.Rename finalName, acForm, tmp
End Sub

Private Sub DeleteFormIfExists(formName As String)
    On Error Resume Next
    DoCmd.DeleteObject acForm, formName
    On Error GoTo 0
End Sub

Private Sub SetStartupForm(formName As String)
    On Error Resume Next
    Dim db As DAO.Database
    Set db = CurrentDb
    Dim p As DAO.Property
    db.Properties("StartupForm") = formName
    If Err.Number <> 0 Then
        Set p = db.CreateProperty("StartupForm", dbText, formName)
        db.Properties.Append p
    End If
    On Error GoTo 0
End Sub


' ===========================================================================
'  1) Main menu frmMain (unbound - buttons only)
' ===========================================================================
Public Sub BuildMain()
    Dim frm As Form
    Set frm = CreateForm()
    frm.Caption = "Medical Lab"

    AddLabel frm.Name, "Medical Lab Management System", 1, 0.5, 13, 1#

    AddBtn frm.Name, "New Patient", "=Nav(""frmPatient"")", 1, 2, 6, 1
    AddBtn frm.Name, "New Order", "=Nav(""frmOrder"")", 8, 2, 6, 1
    AddBtn frm.Name, "Enter Results", "=Nav(""frmResults"")", 1, 3.3, 6, 1
    AddBtn frm.Name, "Search Patient", "=Nav(""frmSearch"")", 8, 3.3, 6, 1
    AddBtn frm.Name, "Manage Tests & Prices", "=Nav(""frmTests"")", 1, 4.6, 6, 1
    AddBtn frm.Name, "Settings (Lab Info)", "=Nav(""tblSettings"")", 8, 4.6, 6, 1

    frm.Section(acDetail).Height = CM(6.5)
    SaveForm frm, "frmMain"
End Sub


' ===========================================================================
'  2) Patient form frmPatient
' ===========================================================================
Public Sub BuildPatient()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "Patients"
    frm.Caption = "Patient"

    AddLabel frm.Name, "Name:", 0.5, 0.5, 3:            AddBox frm.Name, "Full_Name", 3.7, 0.5, 6.5
    AddLabel frm.Name, "Phone:", 0.5, 1.3, 3:           AddBox frm.Name, "Phone", 3.7, 1.3, 3
    AddLabel frm.Name, "Gender:", 0.5, 2.1, 3
    Dim g As Control
    Set g = AddCombo(frm.Name, "Gender", "Male;Female", 1, "3cm", 3.7, 2.1, 3)
    g.RowSourceType = "Value List": g.RowSource = "Male;Female"
    AddLabel frm.Name, "Birth Date:", 0.5, 2.9, 3
    Dim b As Control
    Set b = AddBox(frm.Name, "Birth_Date", 3.7, 2.9, 3)
    b.AfterUpdate = "=AgeUpdate()"
    AddLabel frm.Name, "Age:", 0.5, 3.7, 3:             AddBox frm.Name, "Age", 3.7, 3.7, 1.5
    AddLabel frm.Name, "Address:", 0.5, 4.5, 3:         AddBox frm.Name, "Address", 3.7, 4.5, 6.5
    AddLabel frm.Name, "Referring Doctor:", 0.5, 5.3, 3: AddBox frm.Name, "Referring_Doctor", 3.7, 5.3, 6.5

    AddBtn frm.Name, "Save", "=SaveCurrent()", 0.5, 6.3, 2.5
    AddBtn frm.Name, "New", "=NavNewPatient()", 3.2, 6.3, 2.5
    AddBtn frm.Name, "Back", "=CloseMe()", 5.9, 6.3, 2.5

    frm.Section(acDetail).Height = CM(7.6)
    SaveForm frm, "frmPatient"
End Sub


' ===========================================================================
'  3) Tests form frmTests
' ===========================================================================
Public Sub BuildTests()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "Tests"
    frm.Caption = "Manage Tests & Prices"

    AddLabel frm.Name, "Test Name:", 0.5, 0.5, 3:        AddBox frm.Name, "Test_Name", 4, 0.5, 6.5
    AddLabel frm.Name, "Code:", 0.5, 1.3, 3:             AddBox frm.Name, "Test_Code", 4, 1.3, 2.5
    AddLabel frm.Name, "Category:", 0.5, 2.1, 3:         AddBox frm.Name, "Category", 4, 2.1, 3.5
    AddLabel frm.Name, "Unit:", 0.5, 2.9, 3:             AddBox frm.Name, "Unit", 4, 2.9, 2.5
    AddLabel frm.Name, "Normal Range Min:", 0.5, 3.7, 3: AddBox frm.Name, "Normal_Range_Min", 4, 3.7, 2
    AddLabel frm.Name, "Max:", 6.3, 3.7, 1.5:            AddBox frm.Name, "Normal_Range_Max", 8, 3.7, 2
    AddLabel frm.Name, "Range (text):", 0.5, 4.5, 3:     AddBox frm.Name, "Normal_Range_Text", 4, 4.5, 3.5
    AddLabel frm.Name, "Range Notes:", 0.5, 5.3, 3:      AddBox frm.Name, "Normal_Range_Notes", 4, 5.3, 6.5
    AddLabel frm.Name, "Price:", 0.5, 6.1, 3:            AddBox frm.Name, "Price", 4, 6.1, 2.5
    AddLabel frm.Name, "Sample Type:", 0.5, 6.9, 3:      AddBox frm.Name, "Sample_Type", 4, 6.9, 6.5
    AddLabel frm.Name, "Active?", 0.5, 7.7, 3
    CreateControl frm.Name, acCheckBox, acDetail, , "Is_Active", CM(4), CM(7.7), CM(0.5), CM(0.5)

    AddBtn frm.Name, "Save", "=SaveCurrent()", 0.5, 8.6, 2.5
    AddBtn frm.Name, "New", "=NavNewRecord()", 3.2, 8.6, 2.5
    AddBtn frm.Name, "Back", "=CloseMe()", 5.9, 8.6, 2.5

    frm.Section(acDetail).Height = CM(10)
    SaveForm frm, "frmTests"
End Sub


' ===========================================================================
'  4a) Order details subform sfrmOrderDetails (Datasheet)
' ===========================================================================
Public Sub BuildOrderSub()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "Order_Details"
    frm.DefaultView = 2                        ' Datasheet
    frm.Caption = "Order Details"

    Dim c As Control
    Set c = AddCombo(frm.Name, "Test_ID", _
        "SELECT Test_ID, Test_Name FROM Tests WHERE Is_Active=True ORDER BY Test_Name;", _
        2, "0cm;6cm", 0.2, 0.2, 6)
    c.AfterUpdate = "=OnPickTest()"

    AddBox frm.Name, "Price_At_Order", 6.4, 0.2, 2
    AddBox frm.Name, "Result_Value", 8.6, 0.2, 3
    AddBox frm.Name, "Result_Status", 11.8, 0.2, 2.5

    SaveForm frm, "sfrmOrderDetails"
End Sub

' ===========================================================================
'  4b) Order form frmOrder
' ===========================================================================
Public Sub BuildOrder()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "Orders"
    frm.Caption = "New Order"

    AddLabel frm.Name, "Patient:", 0.5, 0.5, 3
    AddCombo frm.Name, "Patient_ID", _
        "SELECT Patient_ID, Full_Name, Phone FROM Patients ORDER BY Full_Name;", _
        3, "0cm;6cm;3cm", 3.7, 0.5, 8.5
    AddBtn frm.Name, "New Patient", "=NavNewPatient()", 12.4, 0.5, 2.8

    AddLabel frm.Name, "Order Date:", 0.5, 1.3, 3:  AddBox frm.Name, "Order_Date", 3.7, 1.3, 3.5
    AddLabel frm.Name, "Status:", 0.5, 2.1, 3:      AddBox frm.Name, "Status", 3.7, 2.1, 3.5

    Dim sub1 As Control
    Set sub1 = CreateControl(frm.Name, acSubform, acDetail, , "", CM(0.5), CM(3), CM(14), CM(5))
    sub1.Name = "sfDetails"
    sub1.SourceObject = "sfrmOrderDetails"
    sub1.LinkMasterFields = "Order_ID"
    sub1.LinkChildFields = "Order_ID"

    AddLabel frm.Name, "Total:", 0.5, 8.3, 3
    Dim t As Control
    Set t = CreateControl(frm.Name, acTextBox, acDetail, , "", CM(3.7), CM(8.3), CM(3), CM(0.6))
    t.Name = "txtTotal"
    t.ControlSource = "=Nz(DSum(""Price_At_Order"",""Order_Details"",""Order_ID="" & [Order_ID]),0)"

    AddLabel frm.Name, "Paid:", 0.5, 9.1, 3:  AddBox frm.Name, "Amount_Paid", 3.7, 9.1, 3
    AddLabel frm.Name, "Remaining:", 0.5, 9.9, 3
    Dim r As Control
    Set r = CreateControl(frm.Name, acTextBox, acDetail, , "", CM(3.7), CM(9.9), CM(3), CM(0.6))
    r.Name = "txtRemain"
    r.ControlSource = "=[txtTotal]-Nz([Amount_Paid],0)"

    AddBtn frm.Name, "Save", "=SaveOrder()", 0.5, 10.9, 2.5
    AddBtn frm.Name, "Save + Invoice PDF", "=DoInvoicePDF()", 3.2, 10.9, 4.5
    AddBtn frm.Name, "Back", "=CloseMe()", 7.9, 10.9, 2.5

    frm.Section(acDetail).Height = CM(12)
    SaveForm frm, "frmOrder"
End Sub


' ===========================================================================
'  5a) Results subform sfrmResults
' ===========================================================================
Public Sub BuildResultsSub()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "Order_Details"
    frm.DefaultView = 2
    frm.Caption = "Enter Results"

    Dim c As Control
    Set c = AddCombo(frm.Name, "Test_ID", _
        "SELECT Test_ID, Test_Name FROM Tests ORDER BY Test_Name;", _
        2, "0cm;6cm", 0.2, 0.2, 6)

    Dim v As Control
    Set v = AddBox(frm.Name, "Result_Value", 6.4, 0.2, 3)
    v.AfterUpdate = "=OnResultEntered()"
    AddBox frm.Name, "Result_Status", 9.6, 0.2, 2.5
    AddBox frm.Name, "Result_Date", 12.2, 0.2, 2.5

    SaveForm frm, "sfrmResults"
End Sub

' ===========================================================================
'  5b) Results form frmResults
' ===========================================================================
Public Sub BuildResults()
    Dim frm As Form
    Set frm = CreateForm()
    frm.RecordSource = "SELECT * FROM Orders WHERE Status IN ('Registered','In Progress') ORDER BY Order_Date DESC;"
    frm.Caption = "Enter Results"

    AddLabel frm.Name, "Go to order #:", 0.5, 0.5, 3.5
    Dim p As Control
    Set p = CreateControl(frm.Name, acComboBox, acDetail, , "", CM(4), CM(0.5), CM(4.5), CM(0.6))
    p.Name = "cboPick"
    p.RowSourceType = "Table/Query"
    p.RowSource = "SELECT Order_ID, Order_ID FROM Orders WHERE Status IN ('Registered','In Progress') ORDER BY Order_ID DESC;"
    p.ColumnCount = 1
    p.AfterUpdate = "=GoToOrder()"

    AddLabel frm.Name, "Order #:", 0.5, 1.3, 3:  AddBox frm.Name, "Order_ID", 4, 1.3, 2.5
    AddLabel frm.Name, "Status:", 0.5, 2.1, 3:   AddBox frm.Name, "Status", 4, 2.1, 3

    Dim sub1 As Control
    Set sub1 = CreateControl(frm.Name, acSubform, acDetail, , "", CM(0.5), CM(3), CM(14), CM(5))
    sub1.Name = "sfResults"
    sub1.SourceObject = "sfrmResults"
    sub1.LinkMasterFields = "Order_ID"
    sub1.LinkChildFields = "Order_ID"

    AddBtn frm.Name, "Save + Mark Ready", "=SetOrderStatus(""Ready"")", 0.5, 8.3, 4
    AddBtn frm.Name, "Result PDF", "=DoResultPDF()", 4.7, 8.3, 3.5
    AddBtn frm.Name, "Back", "=CloseMe()", 8.4, 8.3, 2.3

    frm.Section(acDetail).Height = CM(9.5)
    SaveForm frm, "frmResults"
End Sub


' ===========================================================================
'  6a) Patient history subform sfrmSearch
' ===========================================================================
Public Sub BuildSearchSub()
    Dim frm As Form
    Set frm = CreateForm()
    ' Patient_ID must be in the source for linking (even if not shown)
    frm.RecordSource = "SELECT Patient_ID, Order_ID, Order_Date, Status, Total_Price, Amount_Paid FROM Orders ORDER BY Order_Date DESC;"
    frm.DefaultView = 2
    frm.Caption = "Patient Orders"

    AddBox frm.Name, "Order_ID", 0.2, 0.2, 2
    AddBox frm.Name, "Order_Date", 2.4, 0.2, 3
    AddBox frm.Name, "Status", 5.6, 0.2, 2.5
    AddBox frm.Name, "Total_Price", 8.3, 0.2, 2.5
    AddBox frm.Name, "Amount_Paid", 11, 0.2, 2.5

    SaveForm frm, "sfrmSearch"
End Sub

' ===========================================================================
'  6b) Search form frmSearch
' ===========================================================================
Public Sub BuildSearch()
    Dim frm As Form
    Set frm = CreateForm()
    frm.Caption = "Search Patient"

    AddLabel frm.Name, "Select patient (by name or phone):", 0.5, 0.5, 5.5
    Dim c As Control
    Set c = CreateControl(frm.Name, acComboBox, acDetail, , "", CM(6.2), CM(0.5), CM(8), CM(0.6))
    c.Name = "cboPatient"
    c.RowSourceType = "Table/Query"
    c.RowSource = "SELECT Patient_ID, Full_Name, Phone FROM Patients ORDER BY Full_Name;"
    c.ColumnCount = 3
    c.ColumnWidths = "0cm;6cm;3cm"
    c.BoundColumn = 1
    c.AfterUpdate = "=RequerySub()"

    Dim sub1 As Control
    Set sub1 = CreateControl(frm.Name, acSubform, acDetail, , "", CM(0.5), CM(1.5), CM(14), CM(6))
    sub1.Name = "sfOrders"
    sub1.SourceObject = "sfrmSearch"
    sub1.LinkMasterFields = "cboPatient"
    sub1.LinkChildFields = "Patient_ID"

    AddBtn frm.Name, "Export Result PDF (selected order)", "=ExportSelectedResult()", 0.5, 7.8, 6
    AddBtn frm.Name, "Back", "=CloseMe()", 7, 7.8, 2.5

    frm.Section(acDetail).Height = CM(9)
    SaveForm frm, "frmSearch"
End Sub

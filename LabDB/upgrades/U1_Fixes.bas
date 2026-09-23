Option Compare Database
Option Explicit

' ============================================================================
'  Medical Lab - Fix pack 1
' ----------------------------------------------------------------------------
'  Fixes found during the first live test:
'   1) Orders.Status default value was stored as 'Registered' (with quotes).
'      -> set a clean default and repair any rows already saved wrong.
'   2) frmOrder: Order Date / Status boxes too narrow (showed ####).
'   3) Subform datasheet columns showed control names (cboTest_ID ...).
'      -> give them friendly captions.
'   4) Delete orphan reports left over from the failed build attempts
'      (Report1, Report2, Report3).
'
'  Run: type FixAll in the Immediate window and press Enter.
'  Safe to run more than once.
' ============================================================================

Public Sub FixAll()
    Dim log As String
    log = Step("Status default + data", "FixStatus")
    log = log & Step("frmOrder layout", "FixOrderForm")
    log = log & Step("Subform captions", "FixSubCaptions")
    log = log & Step("Remove orphan reports", "DropOrphans")

    Application.RefreshDatabaseWindow
    MsgBox "Fixes finished." & vbCrLf & vbCrLf & log, vbInformation, "Fix result"
End Sub

Private Function Step(what As String, procName As String) As String
    On Error GoTo Fail
    Application.Run procName
    Step = "[OK]   " & what & vbCrLf
    Exit Function
Fail:
    Step = "[FAIL] " & what & "  ->  " & Err.Description & vbCrLf
End Function


' 1) Clean default value for Orders.Status, and repair saved rows
Public Sub FixStatus()
    Dim db As DAO.Database
    Set db = CurrentDb
    ' double quotes make Access store a plain literal
    db.TableDefs("Orders").Fields("Status").DefaultValue = """Registered"""

    ' repair any rows that were saved with the quoted value
    db.Execute "UPDATE Orders SET Status='Registered' " & _
               "WHERE Status Like ""'*'"" OR Status Is Null;", dbFailOnError
End Sub


' 2) Widen the narrow boxes on frmOrder
Public Sub FixOrderForm()
    DoCmd.OpenForm "frmOrder", acDesign, , , , acHidden
    Dim f As Form
    Set f = Forms("frmOrder")
    On Error Resume Next
    f!txtOrder_Date.Width = CLng(5.5 * 567)
    f!txtStatus.Width = CLng(5.5 * 567)
    On Error GoTo 0
    DoCmd.Close acForm, "frmOrder", acSaveYes
End Sub


' 3) Friendly column headings in the datasheet subforms
Public Sub FixSubCaptions()
    SetCap "sfrmOrderDetails", "cboTest_ID", "Test"
    SetCap "sfrmOrderDetails", "txtPrice_At_Order", "Price"
    SetCap "sfrmOrderDetails", "txtResult_Value", "Result"
    SetCap "sfrmOrderDetails", "txtResult_Status", "Status"

    SetCap "sfrmResults", "cboTest_ID", "Test"
    SetCap "sfrmResults", "txtResult_Value", "Result"
    SetCap "sfrmResults", "txtResult_Status", "Status"
    SetCap "sfrmResults", "txtResult_Date", "Result Date"

    SetCap "sfrmSearch", "txtOrder_ID", "Order #"
    SetCap "sfrmSearch", "txtOrder_Date", "Date"
    SetCap "sfrmSearch", "txtStatus", "Status"
    SetCap "sfrmSearch", "txtTotal_Price", "Total"
    SetCap "sfrmSearch", "txtAmount_Paid", "Paid"
End Sub

' In datasheet view the column heading comes from the control's attached label
Private Sub SetCap(formName As String, ctlName As String, cap As String)
    On Error Resume Next
    DoCmd.OpenForm formName, acDesign, , , , acHidden
    Dim f As Form
    Set f = Forms(formName)
    f(ctlName).Controls(0).Caption = cap    ' attached label
    DoCmd.Close acForm, formName, acSaveYes
End Sub


' 4) Remove leftover reports from the failed build attempts
Public Sub DropOrphans()
    Dim n As Variant
    On Error Resume Next
    For Each n In Array("Report1", "Report2", "Report3", "Report4")
        DoCmd.DeleteObject acReport, CStr(n)
    Next n
    On Error GoTo 0
End Sub

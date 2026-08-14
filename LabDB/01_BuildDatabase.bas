Option Compare Database
Option Explicit

' ============================================================================
'  Medical Lab - Stage 1 : Create tables, relationships and sample data
' ----------------------------------------------------------------------------
'  Creates 5 tables: Patients, Tests, Orders, Order_Details, tblSettings
'  Sets primary keys, required fields, default values.
'  Creates relationships with referential integrity.
'  Adds 3 sample tests + settings row.
'
'  HOW TO RUN (once):
'   1) Create a new blank Access database, save as LabDB.accdb
'   2) Press Alt + F11 (VBA editor)
'   3) Insert > Module
'   4) Paste ALL of this file
'   5) Put the cursor inside BuildDatabase and press F5
'   6) A success message appears -> close editor, open the Tables list
'
'  Safe to re-run: it deletes old tables and rebuilds them.
'  (WARNING: re-running erases any data you entered, so do NOT re-run
'   after you start real work.)
' ============================================================================

Public Sub BuildDatabase()
    On Error GoTo Fail
    Dim db As DAO.Database
    Set db = CurrentDb

    CleanUp db

    CreatePatients db
    CreateTests db
    CreateOrders db
    CreateOrderDetails db
    CreateSettings db

    db.TableDefs.Refresh

    CreateRelationships db
    InsertSampleData db

    RefreshNavPane

    MsgBox "SUCCESS: All tables, relationships and sample data were created." & vbCrLf & _
           "Close this editor and open the Tables list to check.", vbInformation, "Done"
    Exit Sub
Fail:
    MsgBox "Error " & Err.Number & vbCrLf & Err.Description, vbCritical, "Error"
End Sub


' ---------------------------------------------------------------------------
'  Helpers to add fields
' ---------------------------------------------------------------------------
Private Sub AddText(td As DAO.TableDef, fname As String, fsize As Integer, _
                    Optional isRequired As Boolean = False, Optional defVal As String = "")
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbText, fsize)
    f.Required = isRequired
    f.AllowZeroLength = True
    If Len(defVal) > 0 Then f.DefaultValue = defVal
    td.Fields.Append f
End Sub

Private Sub AddLong(td As DAO.TableDef, fname As String, Optional isRequired As Boolean = False)
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbLong)
    f.Required = isRequired
    td.Fields.Append f
End Sub

Private Sub AddDouble(td As DAO.TableDef, fname As String)
    td.Fields.Append td.CreateField(fname, dbDouble)
End Sub

Private Sub AddCurrency(td As DAO.TableDef, fname As String, Optional isRequired As Boolean = False)
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbCurrency)
    f.Required = isRequired
    td.Fields.Append f
End Sub

Private Sub AddDate(td As DAO.TableDef, fname As String, Optional defVal As String = "")
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbDate)
    If Len(defVal) > 0 Then f.DefaultValue = defVal
    td.Fields.Append f
End Sub

Private Sub AddYesNo(td As DAO.TableDef, fname As String, Optional defaultYes As Boolean = True)
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbBoolean)
    f.DefaultValue = IIf(defaultYes, "-1", "0")
    td.Fields.Append f
End Sub

Private Sub AddAutoPK(td As DAO.TableDef, fname As String)
    Dim f As DAO.Field
    Set f = td.CreateField(fname, dbLong)
    f.Attributes = dbAutoIncrField
    td.Fields.Append f

    Dim idx As DAO.Index
    Set idx = td.CreateIndex("PrimaryKey")
    idx.Primary = True
    idx.Unique = True
    idx.Fields.Append idx.CreateField(fname)
    td.Indexes.Append idx
End Sub


' ---------------------------------------------------------------------------
'  Tables
' ---------------------------------------------------------------------------
Private Sub CreatePatients(db As DAO.Database)
    Dim td As DAO.TableDef
    Set td = db.CreateTableDef("Patients")
    AddAutoPK td, "Patient_ID"
    AddText td, "Full_Name", 100, True
    AddText td, "Phone", 20
    AddText td, "Gender", 10
    AddDate td, "Birth_Date"
    AddLong td, "Age"
    AddText td, "Address", 200
    AddText td, "Referring_Doctor", 100
    AddDate td, "Created_At", "Now()"
    db.TableDefs.Append td
End Sub

Private Sub CreateTests(db As DAO.Database)
    Dim td As DAO.TableDef
    Set td = db.CreateTableDef("Tests")
    AddAutoPK td, "Test_ID"
    AddText td, "Test_Name", 150, True
    AddText td, "Test_Code", 20
    AddText td, "Category", 50
    AddText td, "Unit", 20
    AddDouble td, "Normal_Range_Min"
    AddDouble td, "Normal_Range_Max"
    AddText td, "Normal_Range_Text", 100
    AddText td, "Normal_Range_Notes", 255
    AddCurrency td, "Price", True
    AddText td, "Sample_Type", 150
    AddYesNo td, "Is_Active", True
    db.TableDefs.Append td
End Sub

Private Sub CreateOrders(db As DAO.Database)
    Dim td As DAO.TableDef
    Set td = db.CreateTableDef("Orders")
    AddAutoPK td, "Order_ID"
    AddLong td, "Patient_ID", True
    AddDate td, "Order_Date", "Now()"
    AddText td, "Status", 20, False, "'Registered'"
    AddCurrency td, "Total_Price"
    AddCurrency td, "Amount_Paid"
    AddText td, "Notes", 255
    db.TableDefs.Append td

    AddForeignIndex db, "Orders", "Patient_ID"
End Sub

Private Sub CreateOrderDetails(db As DAO.Database)
    Dim td As DAO.TableDef
    Set td = db.CreateTableDef("Order_Details")
    AddAutoPK td, "Order_Detail_ID"
    AddLong td, "Order_ID", True
    AddLong td, "Test_ID", True
    AddCurrency td, "Price_At_Order"
    AddText td, "Result_Value", 100
    AddText td, "Result_Status", 20
    AddDate td, "Result_Date"
    AddText td, "Entered_By", 50
    db.TableDefs.Append td

    AddForeignIndex db, "Order_Details", "Order_ID"
    AddForeignIndex db, "Order_Details", "Test_ID"
End Sub

Private Sub CreateSettings(db As DAO.Database)
    Dim td As DAO.TableDef
    Set td = db.CreateTableDef("tblSettings")
    AddAutoPK td, "Setting_ID"
    AddText td, "Lab_Name", 150
    AddText td, "Lab_Address", 200
    AddText td, "Lab_Phone", 50
    AddText td, "Signatory_Name", 100
    AddText td, "Logo_Path", 255
    db.TableDefs.Append td
End Sub

Private Sub AddForeignIndex(db As DAO.Database, tableName As String, fieldName As String)
    Dim td As DAO.TableDef
    Set td = db.TableDefs(tableName)
    Dim idx As DAO.Index
    Set idx = td.CreateIndex("idx_" & fieldName)
    idx.Fields.Append idx.CreateField(fieldName)
    td.Indexes.Append idx
End Sub


' ---------------------------------------------------------------------------
'  Relationships
' ---------------------------------------------------------------------------
Private Sub CreateRelationships(db As DAO.Database)
    MakeRelation db, "rel_Patients_Orders", "Patients", "Orders", _
                 "Patient_ID", "Patient_ID", False
    MakeRelation db, "rel_Orders_Details", "Orders", "Order_Details", _
                 "Order_ID", "Order_ID", True
    MakeRelation db, "rel_Tests_Details", "Tests", "Order_Details", _
                 "Test_ID", "Test_ID", False
End Sub

Private Sub MakeRelation(db As DAO.Database, relName As String, _
                         parentTbl As String, childTbl As String, _
                         parentField As String, childField As String, _
                         cascadeDelete As Boolean)
    Dim rel As DAO.Relation
    Set rel = db.CreateRelation(relName, parentTbl, childTbl)
    If cascadeDelete Then
        rel.Attributes = dbRelationDeleteCascade
    Else
        rel.Attributes = 0
    End If
    Dim fld As DAO.Field
    Set fld = rel.CreateField(parentField)
    fld.ForeignName = childField
    rel.Fields.Append fld
    db.Relations.Append rel
End Sub


' ---------------------------------------------------------------------------
'  Sample data (English). Delete the 3 sample tests later before importing.
' ---------------------------------------------------------------------------
Private Sub InsertSampleData(db As DAO.Database)
    db.Execute "INSERT INTO Tests (Test_Name, Test_Code, Category, Unit, " & _
        "Normal_Range_Min, Normal_Range_Max, Price, Sample_Type, Is_Active) VALUES " & _
        "('Fasting Glucose','GLU-F','Chemistry','mg/dL',70,110,50,'Serum',True)", dbFailOnError

    db.Execute "INSERT INTO Tests (Test_Name, Test_Code, Category, Unit, " & _
        "Normal_Range_Min, Normal_Range_Max, Price, Sample_Type, Is_Active) VALUES " & _
        "('Hemoglobin','HGB','Hematology','g/dL',12,16,40,'EDTA whole blood',True)", dbFailOnError

    db.Execute "INSERT INTO Tests (Test_Name, Test_Code, Category, " & _
        "Normal_Range_Text, Price, Sample_Type, Is_Active) VALUES " & _
        "('Pregnancy Test','HCG-Q','Hormones','Negative',60,'Urine',True)", dbFailOnError

    db.Execute "INSERT INTO tblSettings (Lab_Name, Lab_Address, Lab_Phone, Signatory_Name) " & _
        "VALUES ('My Medical Lab','Address here','01000000000','Dr. Signatory')", dbFailOnError
End Sub


' ---------------------------------------------------------------------------
'  Refresh the navigation pane so new tables show immediately
' ---------------------------------------------------------------------------
Private Sub RefreshNavPane()
    On Error Resume Next
    Application.RefreshDatabaseWindow
    DoEvents
End Sub


' ---------------------------------------------------------------------------
'  Cleanup (allows safe re-run)
' ---------------------------------------------------------------------------
Private Sub CleanUp(db As DAO.Database)
    On Error Resume Next
    db.Relations.Delete "rel_Patients_Orders"
    db.Relations.Delete "rel_Orders_Details"
    db.Relations.Delete "rel_Tests_Details"

    Dim t As Variant
    For Each t In Array("Order_Details", "Orders", "Tests", "Patients", "tblSettings")
        db.TableDefs.Delete CStr(t)
    Next t
    db.TableDefs.Refresh
    On Error GoTo 0
End Sub

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "financial_number" TEXT,
    "name" TEXT NOT NULL,
    "job_title" TEXT,
    "work_place" TEXT,
    "department" TEXT,
    "national_id" TEXT,
    "phone" TEXT,
    "work_type" TEXT,
    "role" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "medical_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "financial_number" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_by" TEXT,
    "service_type" TEXT,
    "request_type" TEXT,
    "monthly_treatment_type" TEXT,
    "monthly_doctor_id" TEXT,
    "monthly_doctor_name" TEXT,
    "notes" TEXT,
    "symptoms" TEXT,
    "job_title" TEXT,
    "work_type" TEXT,
    "national_id" TEXT,
    "phone" TEXT,
    "manager_decision_reason" TEXT,
    "doctor_diagnosis" TEXT,
    "sick_leave_days" INTEGER,
    "sick_leave_reason" TEXT,
    "manager_id" TEXT,
    "manager_name" TEXT,
    "doctor_id" TEXT,
    "security_out_user_id" TEXT,
    "security_in_user_id" TEXT,
    "pharmacy_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" DATETIME,
    "checked_out_at" DATETIME,
    "diagnosed_at" DATETIME,
    "dispensed_at" DATETIME,
    "returned_at" DATETIME,
    "completed_at" DATETIME,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "request_medications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "request_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    CONSTRAINT "request_medications_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "medical_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "request_timeline_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "request_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_role" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "request_timeline_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "medical_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "request_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "request_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT NOT NULL,
    CONSTRAINT "request_attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "medical_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "request_id" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "facility" TEXT NOT NULL,
    "external_doctor" TEXT,
    "reason" TEXT NOT NULL,
    "admin_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_admin',
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" DATETIME,
    "reviewed_by" TEXT,
    CONSTRAINT "referrals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "medical_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "manager_id" TEXT,
    "manager_financial_number" TEXT
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "current_stock" INTEGER,
    "minimum_stock" INTEGER,
    "category" TEXT,
    "active_ingredient" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "user_name" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "details" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "security_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "request_id" TEXT,
    "employee_id" TEXT,
    "employee_name" TEXT,
    "type" TEXT NOT NULL,
    "officer_id" TEXT,
    "officer_name" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "request_id" TEXT,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "color" TEXT,
    "bg" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_financial_number_idx" ON "users"("financial_number");

-- CreateIndex
CREATE INDEX "medical_requests_employee_id_idx" ON "medical_requests"("employee_id");

-- CreateIndex
CREATE INDEX "medical_requests_status_idx" ON "medical_requests"("status");

-- CreateIndex
CREATE INDEX "medical_requests_financial_number_idx" ON "medical_requests"("financial_number");

-- CreateIndex
CREATE INDEX "request_medications_request_id_idx" ON "request_medications"("request_id");

-- CreateIndex
CREATE INDEX "request_timeline_events_request_id_idx" ON "request_timeline_events"("request_id");

-- CreateIndex
CREATE INDEX "request_attachments_request_id_idx" ON "request_attachments"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_request_id_key" ON "referrals"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "medicines_name_idx" ON "medicines"("name");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "security_logs_request_id_idx" ON "security_logs"("request_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

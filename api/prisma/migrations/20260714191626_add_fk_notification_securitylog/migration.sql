-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "request_id" TEXT,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "color" TEXT,
    "bg" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "medical_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_notifications" ("bg", "color", "created_at", "icon", "id", "message", "request_id", "title", "unread", "user_id") SELECT "bg", "color", "created_at", "icon", "id", "message", "request_id", "title", "unread", "user_id" FROM "notifications";
DROP TABLE "notifications";
ALTER TABLE "new_notifications" RENAME TO "notifications";
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_request_id_idx" ON "notifications"("request_id");
CREATE TABLE "new_security_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "request_id" TEXT,
    "employee_id" TEXT,
    "employee_name" TEXT,
    "type" TEXT NOT NULL,
    "officer_id" TEXT,
    "officer_name" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_logs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "medical_requests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_security_logs" ("created_at", "employee_id", "employee_name", "id", "notes", "officer_id", "officer_name", "request_id", "type") SELECT "created_at", "employee_id", "employee_name", "id", "notes", "officer_id", "officer_name", "request_id", "type" FROM "security_logs";
DROP TABLE "security_logs";
ALTER TABLE "new_security_logs" RENAME TO "security_logs";
CREATE INDEX "security_logs_request_id_idx" ON "security_logs"("request_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

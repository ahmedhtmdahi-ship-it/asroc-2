-- أعمدة مستوى HTTP في audit_logs — كانت متضافة في schema.prisma من غير migration
-- (شغالة مع db push فقط)، فأي داتابيز متزرعة بـ migrate deploy كانت بترمي P2022
-- في GET /audit-logs وبتُفشل الـ onSend audit hook بصمت.
ALTER TABLE "audit_logs" ADD COLUMN "endpoint" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "method" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "user_agent" TEXT;

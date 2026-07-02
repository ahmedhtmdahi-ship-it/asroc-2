-- AlterTable: force password change on first login (seeded accounts default true via seed).
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

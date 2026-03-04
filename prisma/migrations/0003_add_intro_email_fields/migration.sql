-- AlterTable
ALTER TABLE "introductions" ADD COLUMN "intro_email_subject" TEXT;
ALTER TABLE "introductions" ADD COLUMN "intro_email_body" TEXT;
ALTER TABLE "introductions" ADD COLUMN "intro_sent_at" TIMESTAMP(3);

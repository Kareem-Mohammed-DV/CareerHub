-- CreateEnum
CREATE TYPE "alert_frequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NEW_MATCHING_JOB';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "job_alerts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "keyword" VARCHAR(120),
    "location" VARCHAR(120),
    "category" VARCHAR(100),
    "experience_level" "ExperienceLevel",
    "employment_type" "EmploymentType",
    "workplace_type" "WorkplaceType",
    "frequency" "alert_frequency" NOT NULL DEFAULT 'DAILY',
    "last_run_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "target" VARCHAR(160) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_alerts_user_id_active_idx" ON "job_alerts"("user_id", "active");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- AddForeignKey
ALTER TABLE "job_alerts" ADD CONSTRAINT "job_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


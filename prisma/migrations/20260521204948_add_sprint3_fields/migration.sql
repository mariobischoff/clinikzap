-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cancellationTemplate" TEXT,
ADD COLUMN     "confirmationTemplate" TEXT,
ADD COLUMN     "reminderHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "reminderTemplate" TEXT;

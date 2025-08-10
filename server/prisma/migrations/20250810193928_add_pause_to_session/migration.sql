-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "remainingSeconds" INTEGER;

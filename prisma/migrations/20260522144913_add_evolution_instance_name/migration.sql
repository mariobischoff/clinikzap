-- AlterTable: add evolutionInstanceName to User
ALTER TABLE "User" ADD COLUMN "evolutionInstanceName" TEXT;
CREATE UNIQUE INDEX "User_evolutionInstanceName_key" ON "User"("evolutionInstanceName");

-- AlterEnum: add COMPLETED and NOSHOW to AppointmentStatus
ALTER TYPE "AppointmentStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'NOSHOW';
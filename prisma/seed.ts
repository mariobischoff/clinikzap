import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  const clinic = await prisma.user.upsert({
    where: { email: 'clinica@teste.com' },
    update: {},
    create: {
      email: 'clinica@teste.com',
      password: hashedPassword,
      name: 'Clínica Teste Odontologia',
      workingHours: ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
      weeklyHours: {
        "0": [],
        "1": ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
        "2": ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
        "3": ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
        "4": ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
        "5": ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
        "6": ["08:00", "09:00", "10:00", "11:00", "13:00"],
      },
      duration: 30,
      confirmationTemplate: 'Olá, *{nome_paciente}*! Sua consulta na *{nome_clinica}* foi confirmada para *{data_consulta}* às *{hora_consulta}*.',
      cancellationTemplate: 'Olá, *{nome_paciente}*. Sua consulta na *{nome_clinica}* do dia *{data_consulta}* às *{hora_consulta}* foi cancelada.',
      reminderTemplate: 'Olá, *{nome_paciente}*! Lembrete: sua consulta na *{nome_clinica}* é amanhã, *{data_consulta}* às *{hora_consulta}*.',
      reminderHours: 24,
    },
  });

  console.log(`Clinica criada: ${clinic.name} (${clinic.email})`);

  const customer = await prisma.customer.upsert({
    where: { phone_userId: { phone: '5511999999999', userId: clinic.id } },
    update: {},
    create: {
      name: 'João Silva',
      phone: '5511999999999',
      userId: clinic.id,
      notes: 'Paciente recorrente, prefere período da manhã.',
    },
  });

  console.log(`Customer criado: ${customer.name} (${customer.phone})`);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  await prisma.appointment.upsert({
    where: { token: 'seed-token-confirmed' },
    update: {},
    create: {
      customerId: customer.id,
      userId: clinic.id,
      appointmentDate: tomorrow,
      status: 'CONFIRMED',
      token: 'seed-token-confirmed',
    },
  });

  console.log(`Appointment CONFIRMED criado para ${tomorrow.toISOString()}`);

  await prisma.appointment.upsert({
    where: { token: 'seed-token-pending' },
    update: {},
    create: {
      customerId: customer.id,
      userId: clinic.id,
      appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      token: 'seed-token-pending',
    },
  });

  console.log('Appointment PENDING criado');
  console.log('Seed concluido!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

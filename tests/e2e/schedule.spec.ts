import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_CLINIC_ID = 'e2e-test-clinic-id';
const TEST_CUSTOMER_ID = 'e2e-test-customer-id';
const TEST_APPOINTMENT_ID = 'e2e-test-appointment-id';
const TEST_TOKEN = 'e2e-test-token-12345';

test.describe('Fluxo de Agendamento do Paciente (E2E)', () => {
  
  test.beforeEach(async () => {
    // 1. Limpar qualquer lixo de testes anteriores
    await cleanupDatabase();

    // 2. Criar massa de dados de teste (Clínica/User, Customer e Agendamento PENDING)
    await prisma.user.create({
      data: {
        id: TEST_CLINIC_ID,
        name: 'Clínica de Teste E2E',
        email: 'clinica-e2e@test.com',
        password: '$2a$12$DUMMYHASHFORTESTINGPURPOSESONLYNOTFORPRODUCTION', // Hashed dummy password
        workingHours: ['09:00', '10:00', '11:00', '14:00', '15:00'],
      }
    });

    await prisma.customer.create({
      data: {
        id: TEST_CUSTOMER_ID,
        name: 'Paciente E2E Original',
        phone: '5511999999999',
        userId: TEST_CLINIC_ID,
      }
    });

    await prisma.appointment.create({
      data: {
        id: TEST_APPOINTMENT_ID,
        customerId: TEST_CUSTOMER_ID,
        userId: TEST_CLINIC_ID,
        appointmentDate: new Date(),
        status: 'PENDING',
        token: TEST_TOKEN,
      }
    });
  });

  test.afterEach(async () => {
    // Limpar massa de dados de teste
    await cleanupDatabase();
  });

  test('Deve guiar o paciente pelas etapas e confirmar o agendamento no banco', async ({ page }) => {
    // 1. Acessar a página pública de agendamento usando o token
    await page.goto(`/schedule/${TEST_TOKEN}`);

    // Verificar se o nome da clínica está correto na tela
    await expect(page.locator('h1')).toHaveText('Clínica de Teste E2E');

    // 2. PASSO 1: Selecionar o primeiro dia da lista (já selecionado por padrão no formulário)
    // Clicar no botão "Escolher Horário" para avançar para o passo 2
    const chooseTimeButton = page.getByRole('button', { name: 'Escolher Horário' });
    await expect(chooseTimeButton).toBeVisible();
    await chooseTimeButton.click();

    // 3. PASSO 2: Selecionar o primeiro slot de horário disponível (ex: "09:00")
    // Esperar os horários carregarem
    const slotButton = page.getByRole('button', { name: '09:00', exact: true });
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    // Clicar no botão "Confirmar Seus Dados" para avançar para o passo 3
    const confirmDataButton = page.getByRole('button', { name: 'Confirmar Seus Dados' });
    await expect(confirmDataButton).toBeVisible();
    await confirmDataButton.click();

    // 4. PASSO 3: Confirmar dados do paciente
    // Verificar se o input do nome possui o valor pré-preenchido do paciente
    const nameInput = page.locator('#pname');
    await expect(nameInput).toHaveValue('Paciente E2E Original');

    // Atualizar o nome do paciente no formulário
    await nameInput.fill('Paciente E2E Confirmado');

    // Clicar no botão "Confirmar Agendamento" para efetivar
    const submitButton = page.getByRole('button', { name: 'Confirmar Agendamento' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // 5. PASSO 4: Verificar tela de sucesso
    await expect(page.getByText('Agendamento Confirmado!')).toBeVisible();
    await expect(page.getByText('Paciente E2E Confirmado').first()).toBeVisible();
    await expect(page.getByText('09:00').first()).toBeVisible();

    // 6. Validar no banco de dados se o status do agendamento mudou para CONFIRMED
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: TEST_APPOINTMENT_ID },
      include: { customer: true }
    });

    expect(updatedAppointment).not.toBeNull();
    expect(updatedAppointment?.status).toBe('CONFIRMED');
    expect(updatedAppointment?.customer.name).toBe('Paciente E2E Confirmado');
    
    // Validar se o horário salvo bate com "09:00"
    const savedHours = updatedAppointment?.appointmentDate.getHours();
    const savedMinutes = updatedAppointment?.appointmentDate.getMinutes();
    expect(savedHours).toBe(9);
    expect(savedMinutes).toBe(0);
  });
});

async function cleanupDatabase() {
  try {
    // Deletar o agendamento de teste se existir
    await prisma.appointment.deleteMany({
      where: {
        id: TEST_APPOINTMENT_ID,
      }
    });

    // Deletar o customer de teste se existir
    await prisma.customer.deleteMany({
      where: {
        id: TEST_CUSTOMER_ID,
      }
    });

    // Deletar a clínica/user de teste se existir
    await prisma.user.deleteMany({
      where: {
        id: TEST_CLINIC_ID,
      }
    });
  } catch (error) {
    console.error('Erro durante o cleanup do banco de dados:', error);
  }
}

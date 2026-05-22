import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_EMAIL = 'e2e-auth-test@example.com';
const TEST_PASSWORD = 'password123';
const TEST_CLINIC_NAME = 'Clinica E2E Teste Autenticacao';

test.describe('Fluxo de Autenticação e Dashboard (E2E)', () => {
  
  test.beforeEach(async () => {
    // Garantir limpeza de usuário anterior se existir
    await cleanupUser();
  });

  test.afterEach(async () => {
    // Garantir limpeza do usuário após o teste
    await cleanupUser();
  });

  test('Deve registrar uma clínica, falhar no login com senha incorreta, logar com sucesso, verificar dashboard e deslogar', async ({ page }) => {
    // 1. Acessar a página de registro
    await page.goto('/register');

    // Preencher campos
    await page.locator('#name').fill(TEST_CLINIC_NAME);
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);

    // Enviar formulário
    await page.getByRole('button', { name: 'Cadastrar Clínica' }).click();

    // Deve redirecionar para a página de login automaticamente
    await expect(page).toHaveURL('/login');

    // 2. Tentar logar com senha inválida
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Deve mostrar alerta de erro
    await expect(page.getByText('Credenciais inválidas. Verifique seu e-mail e senha.')).toBeVisible();

    // 3. Logar com credenciais corretas
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Deve redirecionar para o painel administrativo (dashboard)
    await expect(page).toHaveURL('/dashboard');

    // 4. Validar se o dashboard carregou com o nome e elementos esperados
    await expect(page.getByRole('heading', { name: 'Painel Geral' })).toBeVisible();
    await expect(page.getByText('Gerencie os agendamentos de consultas de sua clínica')).toBeVisible();

    // Validar se o nome da clínica aparece no rodapé do menu lateral
    await expect(page.getByText(TEST_CLINIC_NAME)).toBeVisible();

    // Validar se os widgets de status estão presentes
    await expect(page.getByText('Total').first()).toBeVisible();
    await expect(page.getByText('Confirmados').first()).toBeVisible();
    await expect(page.getByText('Pendentes').first()).toBeVisible();
    await expect(page.getByText('Cancelados').first()).toBeVisible();

    // 5. Testar saída (Logout)
    const logoutButton = page.getByRole('button', { name: 'Sair da Conta' });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Deve redirecionar de volta à página de login
    await expect(page).toHaveURL('/login');
  });
});

async function cleanupUser() {
  try {
    await prisma.user.deleteMany({
      where: {
        email: TEST_EMAIL,
      },
    });
  } catch (error) {
    console.error('Erro ao limpar usuário de teste E2E:', error);
  }
}

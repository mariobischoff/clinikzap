import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

async function handleLogin(formData: FormData) {
  'use server';

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect('/login?error=fields');
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/login?error=invalid');
    }
    // Rethrow redirect error
    throw error;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = params.error;

  let errorMsg = null;
  if (errorCode === 'invalid') {
    errorMsg = 'Credenciais inválidas. Verifique seu e-mail e senha.';
  } else if (errorCode === 'fields') {
    errorMsg = 'Todos os campos são obrigatórios.';
  } else if (errorCode) {
    errorMsg = 'Ocorreu um erro inesperado. Tente novamente.';
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#030712] text-slate-100 p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <Card className="relative w-full max-w-md glass-panel rounded-3xl p-8 shadow-2xl z-10 border-none bg-transparent">
        <CardHeader className="text-center mb-8 p-0">
          <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
            ClinikZap
          </CardTitle>
          <CardDescription className="text-slate-400 mt-2 text-sm">
            Entre na sua conta para gerenciar seus agendamentos
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl">
              {errorMsg}
            </div>
          )}

          <form action={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-slate-350 mb-2">
                Endereço de E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="w-full glass-input rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none text-sm"
                placeholder="clinica@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-slate-355 mb-2">
                Senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="w-full glass-input rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none text-sm"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-2xl transition-all shadow-lg shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              Entrar
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Ainda não tem conta?{' '}
            <Link href="/register" className="text-teal-400 hover:underline font-medium">
              Cadastrar Clínica
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

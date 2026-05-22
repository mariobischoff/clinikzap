import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

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
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-teal-950/10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
            ClinikZap
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Entre na sua conta para gerenciar seus agendamentos
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl">
            {errorMsg}
          </div>
        )}

        <form action={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Endereço de E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors text-sm"
              placeholder="clinica@exemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-2xl transition-all shadow-lg shadow-teal-500/20 hover:scale-[1.01] cursor-pointer"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Ainda não tem conta?{' '}
          <Link href="/register" className="text-teal-400 hover:underline font-medium">
            Cadastrar Clínica
          </Link>
        </p>
      </div>
    </main>
  );
}

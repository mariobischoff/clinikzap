import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// We can define the server action inside the file or in a separate actions file.
// Since it's a small helper page, a server action defined inside the same file (or as a separate action) is easy.
// Let's create a server action in a separate file or directly here since this is a server page.
// Wait, in Next.js, 'use server' at the top of a page file makes all exports server actions, but usually we define actions in a separate file or use a Client Component for form submission.
// Let's make this page a Client Component that calls a Server Action, or a Server Component with a form action!
// In Next.js, form actions can be server functions! This is extremely neat because it works without any client-side JavaScript.
// Let's implement the Server Component with a Server Action as the form action.

async function handleRegister(formData: FormData) {
  'use server';

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    throw new Error('Todos os campos são obrigatórios');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Email já cadastrado');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  redirect('/login');
}

export default async function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-teal-950/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
            ClinikZap
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Crie sua conta administrativa para gerenciar sua clínica
          </p>
        </div>

        <form action={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
              Nome da Clínica / Profissional
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="Ex: Clinica OdontoLife"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Endereço de E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="clinica@exemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              Senha de Acesso
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-2xl transition-all shadow-lg shadow-teal-500/20 hover:scale-[1.01] cursor-pointer"
          >
            Cadastrar Clínica
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Já possui conta?{' '}
          <Link href="/login" className="text-teal-400 hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}

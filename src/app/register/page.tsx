'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { handleRegister } from './actions';

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(handleRegister, { error: null });

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
            Crie sua conta administrativa para gerenciar sua clínica
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {state.error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-slate-350 mb-2">
                Nome da Clínica / Profissional
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                className="w-full glass-input rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none text-sm"
                placeholder="Ex: Clinica OdontoLife"
              />
            </div>

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
                Senha de Acesso
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
              disabled={isPending}
              className="w-full bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-2xl transition-all shadow-lg shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar Clínica'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Já possui conta?{' '}
            <Link href="/login" className="text-teal-400 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

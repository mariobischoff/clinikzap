'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ScheduleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ScheduleError({ reset }: ScheduleErrorProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#030712] text-slate-100 p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center space-y-6">
        <div className="mx-auto w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">Erro no agendamento</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Não foi possível processar seu agendamento. Tente novamente ou entre em contato com a clínica.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={reset}
            className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl text-sm transition-all cursor-pointer shadow-lg shadow-teal-500/10 border-none h-auto flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
          <Link
            href="/"
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-sm transition-all text-center border border-slate-700/50"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}

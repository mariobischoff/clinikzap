'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#030712] text-slate-100 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md w-full glass-panel rounded-3xl p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-100">Algo deu errado</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte se o problema persistir.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-left">
            <p className="text-xs text-red-400 font-mono break-words">{error.message}</p>
            {error.digest && (
              <p className="text-xs text-slate-500 font-mono mt-2">Digest: {error.digest}</p>
            )}
          </div>
        )}

        <Button
          type="button"
          onClick={reset}
          className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl text-sm transition-all cursor-pointer shadow-lg shadow-teal-500/10 border-none h-auto flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </Button>
      </div>
    </main>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px] p-6">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center space-y-6">
        <div className="mx-auto w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">Erro no painel</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Não foi possível carregar o painel administrativo. Tente novamente.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-left">
            <p className="text-xs text-red-400 font-mono break-words">{error.message}</p>
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
    </div>
  );
}

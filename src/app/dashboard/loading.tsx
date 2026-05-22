import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Carregando painel...</p>
      </div>
    </div>
  );
}

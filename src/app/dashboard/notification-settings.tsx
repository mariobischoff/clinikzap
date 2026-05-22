'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateWhatsAppTemplates, updateReminderSettings } from './actions';
import {
  MessageSquare,
  Clock,
  Save,
} from 'lucide-react';

interface NotificationSettingsProps {
  initialConfirmationTemplate: string | null;
  initialCancellationTemplate: string | null;
  initialReminderTemplate: string | null;
  initialReminderHours: number;
}

const DEFAULT_CONFIRMATION = `Olá, *{nome_paciente}*!\n\nConfirmamos seu agendamento na clínica *{nome_clinica}*:\n\n📅 Data: *{data_consulta}*\n⏰ Horário: *{hora_consulta}*\n\nSeu agendamento foi salvo com sucesso!`;
const DEFAULT_CANCELLATION = `Olá, *{nome_paciente}*.\n\nSua consulta na clínica *{nome_clinica}* agendada para *{data_consulta}* às *{hora_consulta}* foi cancelada.`;
const DEFAULT_REMINDER = `Olá, *{nome_paciente}*!\n\nEste é um lembrete da sua consulta amanhã (*{data_consulta}*) às *{hora_consulta}* na clínica *{nome_clinica}*.\n\nContamos com sua presença!`;

export default function NotificationSettings({
  initialConfirmationTemplate,
  initialCancellationTemplate,
  initialReminderTemplate,
  initialReminderHours,
}: NotificationSettingsProps) {
  const [isPending, startTransition] = useTransition();

  const [reminderHours, setReminderHours] = useState(initialReminderHours);
  const [confirmationTemplate, setConfirmationTemplate] = useState(
    initialConfirmationTemplate || DEFAULT_CONFIRMATION
  );
  const [cancellationTemplate, setCancellationTemplate] = useState(
    initialCancellationTemplate || DEFAULT_CANCELLATION
  );
  const [reminderTemplate, setReminderTemplate] = useState(
    initialReminderTemplate || DEFAULT_REMINDER
  );

  const [activePreviewTab, setActivePreviewTab] = useState<'confirmation' | 'cancellation' | 'reminder'>('confirmation');

  const handleSave = () => {
    startTransition(async () => {
      try {
        const resSettings = await updateReminderSettings(reminderHours);
        if (!resSettings.success) {
          toast.error(resSettings.error || 'Erro ao salvar regras de tempo.');
          return;
        }

        const resTemplates = await updateWhatsAppTemplates({
          confirmationTemplate,
          cancellationTemplate,
          reminderTemplate,
        });

        if (resTemplates.success) {
          toast.success('Configurações de notificações salvas com sucesso!');
        } else {
          toast.error(resTemplates.error || 'Erro ao salvar templates.');
        }
      } catch (error) {
        console.error('[Notification Settings] Failed to save:', error);
        toast.error('Erro ao conectar ao servidor.');
      }
    });
  };

  // Helper to parse the template with mock data for preview
  const getPreviewText = (template: string) => {
    return template
      .replace(/{nome_paciente}/g, 'João da Silva')
      .replace(/{nome_clinica}/g, 'Clínica OdontoLife')
      .replace(/{data_consulta}/g, '28/05/2026')
      .replace(/{hora_consulta}/g, '14:30')
      .replace(/{link_consulta}/g, 'https://clinikzap.com/schedule/xyz');
  };

  const getTemplateTextByTab = () => {
    switch (activePreviewTab) {
      case 'confirmation':
        return confirmationTemplate;
      case 'cancellation':
        return cancellationTemplate;
      case 'reminder':
        return reminderTemplate;
    }
  };

  // Quick insertion helpers
  const insertVariable = (variable: string, target: 'confirmation' | 'cancellation' | 'reminder') => {
    if (target === 'confirmation') {
      setConfirmationTemplate((prev) => prev + variable);
    } else if (target === 'cancellation') {
      setCancellationTemplate((prev) => prev + variable);
    } else {
      setReminderTemplate((prev) => prev + variable);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Forms column */}
      <div className="lg:col-span-7 space-y-6">
        {/* Reminder Hours Card */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Regra de Lembrete Antecipado</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Defina com quantas horas de antecedência o lembrete de consulta deve ser enviado automaticamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 max-w-[200px] pt-1">
            <input
              type="number"
              min="1"
              max="168"
              value={reminderHours}
              onChange={(e) => setReminderHours(Number(e.target.value))}
              className="w-full glass-input rounded-2xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all font-mono"
            />
            <span className="text-xs text-slate-400 font-semibold shrink-0">horas antes</span>
          </div>
        </div>

        {/* WhatsApp Templates Card */}
        <div className="glass-panel rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Personalização de Mensagens</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Utilize as variáveis do lado para criar mensagens exclusivas enviadas no WhatsApp.
              </p>
            </div>
          </div>

          {/* Template Editors Tabs */}
          <div className="space-y-6">
            {/* Confirmation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200">Mensagem de Confirmação (Novo Agendamento)</label>
                <div className="flex gap-1.5">
                  {['{nome_paciente}', '{nome_clinica}', '{data_consulta}', '{hora_consulta}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v, 'confirmation')}
                      className="text-[9px] bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-450 hover:text-slate-300 px-2 py-0.5 rounded-lg transition-all"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={confirmationTemplate}
                onChange={(e) => setConfirmationTemplate(e.target.value)}
                rows={4}
                className="w-full glass-input rounded-2xl p-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-y leading-relaxed font-mono"
              />
            </div>

            {/* Cancellation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200">Mensagem de Cancelamento</label>
                <div className="flex gap-1.5">
                  {['{nome_paciente}', '{nome_clinica}', '{data_consulta}', '{hora_consulta}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v, 'cancellation')}
                      className="text-[9px] bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-450 hover:text-slate-300 px-2 py-0.5 rounded-lg transition-all"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={cancellationTemplate}
                onChange={(e) => setCancellationTemplate(e.target.value)}
                rows={3}
                className="w-full glass-input rounded-2xl p-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-y leading-relaxed font-mono"
              />
            </div>

            {/* Reminder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200">Mensagem de Lembrete</label>
                <div className="flex gap-1.5">
                  {['{nome_paciente}', '{nome_clinica}', '{data_consulta}', '{hora_consulta}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v, 'reminder')}
                      className="text-[9px] bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-450 hover:text-slate-300 px-2 py-0.5 rounded-lg transition-all"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={reminderTemplate}
                onChange={(e) => setReminderTemplate(e.target.value)}
                rows={4}
                className="w-full glass-input rounded-2xl p-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-y leading-relaxed font-mono"
              />
            </div>
          </div>

          {/* Action Save Button */}
          <div className="pt-2 border-t border-slate-850 flex justify-end">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-2xl transition-all shadow-lg shadow-teal-500/10 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isPending ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>

      {/* Simulator / Preview Column */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <div className="sticky top-6 w-full max-w-[320px] space-y-4">
          <span className="text-xs font-bold text-slate-400 block text-center uppercase tracking-wider">Simulador WhatsApp</span>

          {/* Preview Tabs selectors */}
          <div className="flex bg-slate-950/40 backdrop-blur-md border border-white/5 p-1.5 rounded-2xl gap-1">
            {(['confirmation', 'cancellation', 'reminder'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActivePreviewTab(tab)}
                className={`flex-1 text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer ${
                  activePreviewTab === tab
                    ? 'bg-slate-850 text-teal-400 border border-slate-750 shadow-sm'
                    : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                {tab === 'confirmation' ? 'Confirmação' : tab === 'cancellation' ? 'Cancelado' : 'Lembrete'}
              </button>
            ))}
          </div>

          {/* Device frame Mock */}
          <div className="relative w-full aspect-[9/18] bg-slate-900 border-4 border-slate-800 rounded-[40px] shadow-2xl p-3.5 flex flex-col justify-between overflow-hidden">
            {/* Top camera notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-slate-950 rounded-full" />
            </div>

            {/* Chat header */}
            <div className="bg-slate-950 border-b border-slate-850 -mx-3.5 -mt-3.5 px-4 pt-8 pb-3.5 flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-850 flex items-center justify-center font-bold text-slate-300 text-xs">
                C
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-100">ClinikZap Notification</h4>
                <span className="text-[8px] text-teal-400 font-semibold block leading-none mt-0.5">Online</span>
              </div>
            </div>

            {/* Chat messages canvas */}
            <div className="flex-1 bg-slate-950/60 -mx-3.5 p-3 flex flex-col justify-end overflow-y-auto space-y-3 pb-4">
              <div className="bg-teal-900/10 border border-teal-950 text-slate-200 text-[10px] p-3 rounded-2xl rounded-tr-none self-end max-w-[85%] shadow-md leading-relaxed whitespace-pre-wrap font-sans break-words border-l-4 border-l-teal-500">
                {getPreviewText(getTemplateTextByTab())}
                <span className="block text-[8px] text-slate-500 text-right mt-1.5 font-medium">17:48 ✔✔</span>
              </div>
            </div>

            {/* Mock Chat input bar */}
            <div className="bg-slate-950 border-t border-slate-850 -mx-3.5 -mb-3.5 p-2 flex items-center gap-2 shrink-0">
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 text-[9px] text-slate-500 font-medium">
                Mensagem...
              </div>
              <div className="w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-slate-950 text-[11px] font-bold">
                ➜
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false,
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        className="max-w-md p-6 rounded-3xl shadow-2xl"
        showCloseButton={false}
      >
        {/* Top Close Button */}
        <Button
          variant="ghost"
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer h-auto w-auto border-none"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Content */}
        <div className="flex gap-4 items-start mt-2">
          <div className={cn(
            'p-3 rounded-2xl shrink-0',
            isDanger
              ? 'bg-red-500/10 text-red-450 border border-red-500/20'
              : 'bg-amber-500/10 text-amber-450 border border-amber-500/20'
          )}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-base font-bold text-slate-100">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 leading-relaxed">
              {message}
            </DialogDescription>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6 justify-end">
          <Button
            variant="outline"
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-950/40 hover:bg-slate-850/40 border border-slate-800 text-slate-350 hover:text-slate-200 rounded-2xl text-xs font-semibold transition-all cursor-pointer h-auto"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={cn(
              'px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-lg border-none h-auto',
              isDanger
                ? 'bg-red-500 hover:bg-red-450 text-slate-950 hover:text-slate-950 shadow-red-500/10'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 hover:text-slate-950 shadow-teal-500/10'
            )}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

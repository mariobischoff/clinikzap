'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 overflow-hidden"
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={onCancel}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="flex gap-4 items-start mt-2">
              <div className={`p-3 rounded-2xl shrink-0 ${isDanger ? 'bg-red-500/10 text-red-450 border border-red-500/20' : 'bg-amber-500/10 text-amber-450 border border-amber-500/20'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-100">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-slate-200 rounded-2xl text-xs font-semibold transition-all cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-lg ${
                  isDanger
                    ? 'bg-red-500 hover:bg-red-400 text-slate-950 shadow-red-500/10'
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/10'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyLinkButtonProps {
  token: string;
}

export default function CopyLinkButton({ token }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const origin = window.location.origin;
    const url = `${origin}/schedule/${token}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copiar Link de Agendamento"
      className="p-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

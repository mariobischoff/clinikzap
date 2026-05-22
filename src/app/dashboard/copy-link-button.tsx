'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <Button
      variant="outline"
      size="icon"
      type="button"
      onClick={handleCopy}
      title="Copiar Link de Agendamento"
      className="bg-slate-800 hover:bg-slate-700/80 border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

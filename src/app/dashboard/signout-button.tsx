'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SignOutButton() {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <Button
      variant="destructive"
      type="button"
      onClick={handleSignOut}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm h-auto cursor-pointer"
    >
      <LogOut className="w-4 h-4" />
      Sair da Conta
    </Button>
  );
}

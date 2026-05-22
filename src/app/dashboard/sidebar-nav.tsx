'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function SidebarNav() {
  const pathname = usePathname();

  const links = [
    {
      href: '/dashboard',
      label: 'Agenda / Agendamentos',
      icon: Calendar,
      exact: true,
    },
    {
      href: '/dashboard/customers',
      label: 'Pacientes',
      icon: Users,
      exact: false,
    },
    {
      href: '/dashboard/evolution',
      label: 'WhatsApp',
      icon: MessageSquare,
      exact: false,
    },
  ];

  return (
    <nav className="p-4 space-y-2">
      {links.map((link) => {
        // Highlight active link: exact match for /dashboard, startsWith for sub-routes (like /dashboard/evolution)
        const isActive = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-semibold transition-all h-auto justify-start',
              isActive
                ? 'bg-slate-800/50 border-slate-800 text-teal-400 font-semibold'
                : 'hover:bg-slate-800/30 text-slate-400 hover:text-slate-200 border-transparent'
            )}
          >
            <Icon className="w-4 h-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

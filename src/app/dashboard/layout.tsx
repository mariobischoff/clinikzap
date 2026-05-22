import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';
import SidebarNav from './sidebar-nav';
import SignOutButton from './signout-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  // If user is not authenticated, redirect to login
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row relative overflow-hidden">
      {/* Decorative Glow Blobs in dashboard background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[140px] animate-float" />
        <div className="absolute bottom-[20%] left-[-5%] w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-[120px] animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#090d16]/65 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between shrink-0 relative z-20">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
              ClinikZap
            </Link>
            <span className="text-[10px] bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold px-2.5 py-0.5 rounded-full">
              SaaS
            </span>
          </div>

          {/* Navigation Links */}
          <SidebarNav />
        </div>

        {/* User Info / LogOut */}
        <div className="p-4 border-t border-white/5 space-y-4 bg-slate-950/20">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-indigo-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/25">
              <AvatarFallback className="bg-transparent text-white font-bold text-base">
                {session.user.name ? session.user.name[0].toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-200 truncate">{session.user.name}</p>
              <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
            </div>
          </div>

          <SignOutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full relative z-10">
        {children}
      </main>
    </div>
  );
}

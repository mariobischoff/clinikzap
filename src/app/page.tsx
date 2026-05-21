import Link from 'next/link';
import { 
  Calendar, 
  MessageSquare, 
  Users, 
  Zap, 
  ArrowRight, 
  CheckCircle2 
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col justify-between selection:bg-teal-500/30 selection:text-teal-200">
      
      {/* 1. Header/Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-tr from-teal-500 to-indigo-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Clinik<span className="text-teal-400">Zap</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-slate-200 transition-colors">Funcionalidades</a>
            <a href="#simulator" className="hover:text-slate-200 transition-colors">Simulador</a>
            <a href="#workflow" className="hover:text-slate-200 transition-colors">Como Funciona</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition-all"
            >
              Acessar Painel
            </Link>
            <Link 
              href="/register" 
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-teal-500/10"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-36 pb-20 overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.06),transparent_50%)] shrink-0">
        <div className="max-w-7xl mx-auto px-6 text-center">
          
          {/* Promo Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-[10px] font-bold text-teal-400 mb-6 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
            Lembretes inteligentes no WhatsApp
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Seus agendamentos no piloto automático com o <span className="bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">WhatsApp</span>
          </h1>

          <p className="mt-6 text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            A plataforma inteligente que automatiza o agendamento de consultas, envia lembretes interativos de presença e gerencia o prontuário dos pacientes para clínicas e consultórios médicos.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto sm:max-w-none">
            <Link 
              href="/register" 
              className="w-full sm:w-auto px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-2xl transition-all shadow-xl shadow-teal-500/15 flex items-center justify-center gap-2 group cursor-pointer"
            >
              Começar Agora Grátis
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-3.5 border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900/50 text-slate-200 hover:text-white font-bold text-xs rounded-2xl transition-all cursor-pointer"
            >
              Acessar Minha Conta
            </Link>
          </div>

          {/* Hero Dashboard Preview Mockup */}
          <div className="mt-16 relative mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-950 p-2 sm:p-3 shadow-2xl shadow-teal-500/5 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 to-indigo-500/10 opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none" />
            <div className="rounded-2xl border border-slate-850 bg-slate-900/40 overflow-hidden aspect-[16/9] flex flex-col">
              
              {/* Mockup Toolbar */}
              <div className="h-10 bg-slate-950 border-b border-slate-850 px-4 flex items-center justify-between shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/30 border border-red-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30 border border-yellow-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/30 border border-green-500/40" />
                </div>
                <div className="bg-slate-900 border border-slate-850 rounded-lg px-8 py-0.5 text-[9px] text-slate-500 font-mono tracking-wide">
                  app.clinikzap.com.br/dashboard
                </div>
                <div className="w-10" />
              </div>
              
              {/* Mockup Content Grid */}
              <div className="flex-1 grid grid-cols-12 overflow-hidden bg-slate-950/20">
                
                {/* Mock Sidebar */}
                <div className="col-span-2 border-r border-slate-850 p-3 space-y-4 hidden sm:block">
                  <div className="h-4 w-16 bg-slate-850 rounded-lg" />
                  <div className="space-y-2 pt-2">
                    <div className="h-6 bg-teal-500/10 border border-teal-500/20 rounded-xl" />
                    <div className="h-6 bg-slate-900 border border-slate-850 rounded-xl" />
                    <div className="h-6 bg-slate-900 border border-slate-850 rounded-xl" />
                  </div>
                </div>
                
                {/* Mock Main Dashboard */}
                <div className="col-span-12 sm:col-span-10 p-4 sm:p-5 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="h-4 w-28 bg-slate-300 rounded" />
                      <div className="h-2 w-44 bg-slate-650 rounded hidden sm:block" />
                    </div>
                    <div className="h-7 w-20 bg-teal-500 rounded-lg" />
                  </div>
                  
                  {/* Cards Mock */}
                  <div className="grid grid-cols-3 gap-3 shrink-0">
                    <div className="h-14 bg-slate-900/60 border border-slate-850 rounded-xl p-2.5 flex flex-col justify-between">
                      <div className="h-1.5 w-8 bg-slate-600 rounded" />
                      <div className="h-4 w-6 bg-slate-200 rounded" />
                    </div>
                    <div className="h-14 bg-slate-900/60 border border-slate-850 rounded-xl p-2.5 flex flex-col justify-between">
                      <div className="h-1.5 w-8 bg-slate-600 rounded" />
                      <div className="h-4 w-6 bg-slate-200 rounded" />
                    </div>
                    <div className="h-14 bg-slate-900/60 border border-slate-850 rounded-xl p-2.5 flex flex-col justify-between">
                      <div className="h-1.5 w-8 bg-slate-600 rounded" />
                      <div className="h-4 w-6 bg-teal-450 rounded" />
                    </div>
                  </div>

                  {/* Large Content Mock */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0">
                    <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-3 flex flex-col justify-between">
                      <div className="h-2 w-20 bg-slate-500 rounded" />
                      <div className="flex-1 flex items-center justify-center pt-2">
                        {/* Mock SVG Donut */}
                        <div className="w-12 h-12 rounded-full border-[3px] border-teal-500 border-t-indigo-500 border-r-slate-800" />
                      </div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-3 flex flex-col justify-between">
                      <div className="h-2 w-24 bg-slate-500 rounded" />
                      <div className="space-y-1.5 pt-2">
                        <div className="h-1.5 w-full bg-slate-800 rounded" />
                        <div className="h-1.5 w-5/6 bg-slate-800 rounded" />
                        <div className="h-1.5 w-4/6 bg-slate-800 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section id="features" className="py-20 border-t border-slate-900/50 bg-slate-950 shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-3 max-w-xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Tudo que sua clínica precisa para crescer</h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Uma experiência unificada de agendamento online e CRM projetada especificamente para economizar seu tempo e evitar faltas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 rounded-3xl p-6 space-y-4 hover:bg-slate-900/70 transition-all group">
              <div className="w-10 h-10 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Agenda Inteligente e Dinâmica</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Configure a duração padrão de consultas, gere horários disponíveis de acordo com seu expediente e controle bloqueios com exceções automáticas de ausência.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 rounded-3xl p-6 space-y-4 hover:bg-slate-900/70 transition-all group">
              <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Notificações por WhatsApp</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Envie confirmações e lembretes de consultas automáticos no WhatsApp. Customize a antecedência dos envios e os templates de mensagens usando variáveis inteligentes.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 rounded-3xl p-6 space-y-4 hover:bg-slate-900/70 transition-all group">
              <div className="w-10 h-10 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">CRM de Pacientes & Anotações</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Histórico detalhado por paciente, métricas individuais de comparecimento e campo de prontuário/anotações clínicas persistentes acopladas ao cadastro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Simulator Section */}
      <section id="simulator" className="py-20 border-t border-slate-900/50 bg-slate-950/40 shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Content info */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                Fácil para você, natural para o paciente
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Como seus pacientes confirmam a consulta
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                No momento em que você agenda ou o sistema envia o lembrete programado, o paciente recebe um link exclusivo e amigável. Ele pode confirmar ou cancelar o comparecimento em um clique.
              </p>
              <ul className="space-y-3 pt-2">
                {[
                  "Sem precisar instalar aplicativos ou criar cadastros chatos",
                  "Ações sincronizadas em tempo real com a agenda do painel médico",
                  "Experiência intuitiva e rápida direto pelo navegador do celular"
                ].map((text, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-350">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Dual visual representation (Phone + Slot Picker Mockup) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Phone screen */}
              <div className="bg-slate-900 border border-slate-800 rounded-[36px] p-3 shadow-xl max-w-[270px] mx-auto w-full aspect-[9/17.5] flex flex-col justify-between overflow-hidden relative">
                <div className="bg-slate-950 border-b border-slate-850 -mx-3 -mt-3 px-3.5 pt-6 pb-2.5 flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-slate-850 flex items-center justify-center font-bold text-slate-350 text-[10px]">
                    C
                  </div>
                  <div>
                    <h4 className="text-[9px] font-bold text-slate-100 leading-none">ClinikZap Lembretes</h4>
                    <span className="text-[7px] text-teal-400 font-semibold mt-0.5 block">Online</span>
                  </div>
                </div>
                
                <div className="flex-1 bg-slate-950/40 -mx-3 p-3 flex flex-col justify-end">
                  <div className="bg-teal-900/10 border border-teal-950 text-slate-200 text-[9px] p-3 rounded-2xl rounded-tr-none self-end max-w-[90%] shadow-md leading-relaxed border-l-2 border-l-teal-500">
                    Olá, *João da Silva*!
                    <br /><br />
                    Este é um lembrete da sua consulta agendada na clínica *OdontoLife* para amanhã, dia *28/05/2026* às *14:30*.
                    <br /><br />
                    Contamos com a sua presença!
                    <span className="block text-[7px] text-slate-500 text-right mt-1.5 font-medium">17:48 ✔✔</span>
                  </div>
                </div>

                <div className="bg-slate-950 border-t border-slate-850 -mx-3 -mb-3 p-2 flex items-center gap-1.5 shrink-0">
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-full px-2.5 py-1 text-[8px] text-slate-600">
                    Mensagem...
                  </div>
                  <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-slate-950 text-[9px] font-bold leading-none">➜</div>
                </div>
              </div>

              {/* Slot selector mockup */}
              <div className="bg-slate-900 border border-slate-850 rounded-3xl p-5 shadow-xl flex flex-col justify-between h-full space-y-4 max-w-[280px] mx-auto w-full">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-teal-400 font-bold">Página de Agendamento</span>
                  <h4 className="text-xs font-bold text-slate-200">Escolha o Horário</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-2 my-2">
                  {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30"].map((time, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                        idx === 2
                          ? "bg-teal-500 text-slate-950 border-teal-500 shadow-md shadow-teal-500/10"
                          : "bg-slate-950 border-slate-850 text-slate-350 hover:border-slate-750"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-850 space-y-1.5 shrink-0">
                  <div className="flex justify-between text-[9px] text-slate-450 font-semibold">
                    <span>Especialidade:</span>
                    <span className="text-slate-300">Ortodontia</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-450 font-semibold">
                    <span>Duração:</span>
                    <span className="text-slate-300">30 min</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="w-full py-2.5 bg-teal-500 text-slate-950 font-bold text-[10px] rounded-xl transition-all shadow-md shadow-teal-500/10 mt-auto cursor-default"
                >
                  Confirmar Agendamento
                </button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works Section */}
      <section id="workflow" className="py-20 border-t border-slate-900/50 bg-slate-950 shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-3 max-w-xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Fluxo simples de 3 passos</h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Descubra como colocar sua clínica no piloto automático hoje mesmo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-900 border border-slate-800 text-teal-400 font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h4 className="text-xs font-bold text-slate-200">Crie sua Conta</h4>
              <p className="text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                Registre sua clínica e defina o tempo padrão das consultas e seus horários de atendimento.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-900 border border-slate-800 text-teal-400 font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h4 className="text-xs font-bold text-slate-200">Conecte o WhatsApp</h4>
              <p className="text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                Escaneie o QR Code na aba do WhatsApp para parear o sistema. Customize os templates de mensagens.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-900 border border-slate-800 text-teal-400 font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h4 className="text-xs font-bold text-slate-200">Agende & Automatize</h4>
              <p className="text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                Crie consultas na agenda e deixe que a nossa plataforma faça o disparo de lembretes e confirmações automáticos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Call To Action Banner */}
      <section className="py-16 bg-slate-950 shrink-0">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-gradient-to-tr from-teal-600 to-indigo-650 rounded-[32px] p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />
            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Pronto para transformar a gestão da sua clínica?
              </h2>
              <p className="text-slate-100/80 text-[11px] sm:text-xs leading-relaxed">
                Junte-se a dezenas de profissionais de saúde que reduziram faltas de pacientes, otimizaram sua agenda de consultas e ganharam muito mais tempo no dia a dia.
              </p>
              <div className="pt-2">
                <Link 
                  href="/register" 
                  className="inline-flex px-7 py-3 bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-xs rounded-2xl transition-all shadow-lg hover:scale-[1.01]"
                >
                  Começar Grátis Agora
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-tr from-teal-500 to-indigo-500 rounded-lg flex items-center justify-center font-bold text-white text-xs">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">
              Clinik<span className="text-teal-400">Zap</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-550">
            &copy; {new Date().getFullYear()} ClinikZap. Todos os direitos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
}

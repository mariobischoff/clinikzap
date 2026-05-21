import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import CustomersCrm from './customers-crm';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="text-center py-12 text-slate-400">
        Você precisa estar autenticado para acessar esta página.
      </div>
    );
  }

  // Fetch all customers belonging to this clinician, including their appointment histories
  const customers = await prisma.customer.findMany({
    where: { userId },
    include: {
      appointments: {
        orderBy: {
          appointmentDate: 'desc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div className="space-y-8 h-full">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Painel de Pacientes (CRM)</h1>
        <p className="text-slate-400 mt-1">
          Acompanhe o prontuário de anotações internas dos pacientes e visualize o histórico de agendamentos.
        </p>
      </div>

      <CustomersCrm initialCustomers={customers} />
    </div>
  );
}

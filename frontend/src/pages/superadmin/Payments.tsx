import { useQuery } from '@tanstack/react-query';
import { CreditCard, FileText } from 'lucide-react';
import { downloadFile } from '../../services/api';
import { Button, DataTable, EmptyState, PageHeader, StatusBadge } from '../../components/ui';
import { dateIN, getPlatformFees, rupees, type PlatformFee } from '../../api/superadmin.api';
import { Panel } from './Panel';

export default function Payments() {
  const { data: fees = [], isLoading } = useQuery({ queryKey: ['admin-fees'], queryFn: getPlatformFees, refetchInterval: 30000 });

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Member fees across every gym on the platform." />

      <Panel title={`Payments ledger (${fees.length})`}>
        <DataTable<PlatformFee>
          caption="Payments ledger"
          loading={isLoading}
          rows={fees}
          rowKey={(f) => f.id}
          empty={<EmptyState title="No fee records yet" icon={CreditCard} />}
          columns={[
            { key: 'member', header: 'Member', cell: (f) => <span className="font-medium">{f.member?.user?.username || '-'}</span> },
            { key: 'gym', header: 'Gym', cell: (f) => f.gym?.name || '-' },
            { key: 'amount', header: 'Amount', align: 'right', cell: (f) => rupees(f.amount) },
            { key: 'due', header: 'Due', cell: (f) => dateIN(f.dueDate) },
            { key: 'status', header: 'Status', cell: (f) => <StatusBadge status={f.status} /> },
            {
              key: 'receipt',
              header: 'Receipt',
              cell: (f) =>
                f.status === 'PAID' ? (
                  <Button size="sm" variant="ghost" icon={FileText} onClick={() => downloadFile(`/fees/${f.id}/receipt`, `receipt-${f.id.slice(0, 8)}.pdf`)}>
                    Download
                  </Button>
                ) : (
                  '-'
                ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}

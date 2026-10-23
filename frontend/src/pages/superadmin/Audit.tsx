import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { DataTable, EmptyState, PageHeader } from '../../components/ui';
import { getAuditLogs, type AuditLog } from '../../api/superadmin.api';
import { Panel } from './Panel';

const actionLabel = (action: string) => {
  const text = action.replace(/[_-]+/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export default function Audit() {
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['admin-audit'], queryFn: getAuditLogs, refetchInterval: 60000 });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Who changed what on the platform, newest first." />

      <Panel title={`Events (${logs.length})`}>
        <DataTable<AuditLog>
          caption="Audit log"
          loading={isLoading}
          rows={logs}
          rowKey={(l) => l.id}
          empty={<EmptyState title="No audit events recorded yet" icon={ScrollText} />}
          columns={[
            { key: 'action', header: 'Action', cell: (l) => <span className="font-medium">{actionLabel(l.action)}</span> },
            { key: 'entity', header: 'Entity', cell: (l) => l.entity },
            { key: 'details', header: 'Details', cell: (l) => <span className="block max-w-80 truncate sm:max-w-80">{l.details || l.entityId || '-'}</span> },
            { key: 'by', header: 'Performed by', cell: (l) => (l.user ? `${l.user.username} (${l.user.email})` : 'System') },
            { key: 'when', header: 'When', cell: (l) => new Date(l.createdAt).toLocaleString('en-IN') },
          ]}
        />
      </Panel>
    </div>
  );
}

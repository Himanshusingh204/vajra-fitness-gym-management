import { useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { getMyGymNotices } from '../../api/notice.api';
import { Card, EmptyState, PageHeader, Skeleton } from '../../components/ui';

export default function NoticesSection() {
  const { data: notices, isLoading } = useQuery({ queryKey: ['myGymNotices'], queryFn: getMyGymNotices, refetchInterval: 60000 });

  return (
    <>
      <PageHeader title="Notices" description="Announcements from your gym." />
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : notices && notices.length > 0 ? (
        <ul className="space-y-3">
          {notices.map((n: any) => (
            <li key={n.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-ink">{n.title}</h2>
                  <time dateTime={n.createdAt} className="shrink-0 text-sm text-ink-muted">{new Date(n.createdAt).toLocaleDateString('en-IN')}</time>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-muted">{n.content}</p>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card><EmptyState icon={Megaphone} title="No notices right now" description="Announcements from your gym will show up here." /></Card>
      )}
    </>
  );
}

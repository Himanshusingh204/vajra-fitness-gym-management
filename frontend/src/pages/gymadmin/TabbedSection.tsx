import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { TabPanel, Tabs } from '../../components/ui';

type TabSpec = { id: string; label: string; count?: number; content: ReactNode };

/** Tabs whose active value lives in ?tab= so other pages can deep link into one. */
export default function TabbedSection({ id, label, tabs }: { id: string; label: string; tabs: TabSpec[] }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const active = tabs.find((t) => t.id === requested) ?? tabs[0];

  return (
    <div>
      <Tabs
        id={id}
        label={label}
        items={tabs.map(({ id: tabId, label: tabLabel, count }) => ({ id: tabId, label: tabLabel, count }))}
        value={active.id}
        onChange={(next) => setParams({ tab: next }, { replace: true })}
      />
      <TabPanel tabsId={id} value={active.id}>
        {active.content}
      </TabPanel>
    </div>
  );
}

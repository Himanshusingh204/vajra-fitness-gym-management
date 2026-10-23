import TabbedSection from './TabbedSection';
import AnalyticsPanel from './AnalyticsPanel';
import ReportsPanel from './ReportsPanel';

export default function ReportsPage() {
  return (
    <TabbedSection
      id="reports"
      label="Reports"
      tabs={[
        { id: 'analytics', label: 'Analytics', content: <AnalyticsPanel /> },
        { id: 'fees', label: 'Revenue and exports', content: <ReportsPanel /> },
      ]}
    />
  );
}

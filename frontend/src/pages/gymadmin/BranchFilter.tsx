import { useGym } from './GymContext';
import { Select } from '../../components/ui';

export default function BranchFilter() {
  const { branches, branchFilter, setBranchFilter } = useGym();
  if (branches.length === 0) return null;
  return (
    <Select aria-label="Filter by branch" className="w-48" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
      <option value="">All branches</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
          {b.isActive ? '' : ' (disabled)'}
        </option>
      ))}
    </Select>
  );
}

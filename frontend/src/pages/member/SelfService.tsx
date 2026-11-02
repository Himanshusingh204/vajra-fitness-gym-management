import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkInToday } from '../../api/membership.api';
import { getMyReferrals } from '../../api/referral.api';

export function CheckInButton() {
  const qc = useQueryClient();
  const checkIn = useMutation({
    mutationFn: checkInToday,
    onSettled: () => qc.invalidateQueries({ queryKey: ['myAttendance'] }),
  });
  const error = (checkIn.error as any)?.response?.data?.error;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <button
        onClick={() => checkIn.mutate()}
        disabled={checkIn.isPending || checkIn.isSuccess}
        className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {checkIn.isSuccess ? 'Checked in' : 'Check in today'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ReferralCard() {
  const { data } = useQuery({ queryKey: ['myReferrals'], queryFn: getMyReferrals });
  if (!data) return null;
  const link = `${window.location.origin}/register/member?ref=${data.code}`;

  return (
    <div className="mt-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="font-bold dark:text-white">Refer a friend</h3>
      <p className="mt-1 text-sm text-gray-500">
        Your code: <span className="font-mono font-bold">{data.code}</span>
      </p>
      <button
        onClick={() => navigator.clipboard?.writeText(link)}
        className="mt-3 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
      >
        Copy share link
      </button>
      <ul className="mt-4 space-y-1 text-sm">
        {data.referrals.map((r) => (
          <li key={r.id} className="flex justify-between">
            <span>{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
            <span className="font-semibold">{r.status}</span>
          </li>
        ))}
        {data.referrals.length === 0 && <li className="text-gray-500">No referrals yet.</li>}
      </ul>
    </div>
  );
}

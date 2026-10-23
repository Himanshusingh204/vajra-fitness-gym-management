import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Download, ExternalLink } from 'lucide-react';
import { getMyFees } from '../../api/member.api';
import { getPaymentConfig, createCheckout, verifyPayment, loadRazorpayScript } from '../../api/payment.api';
import { Button, Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { downloadFile } from '../../services/api';
import { formatPrice } from '../../utils/format';
import { useMemberProfile } from './useMemberProfile';

const methodLabel = (m: string) => (m === 'CASH' ? 'at the gym' : m === 'UPI' ? 'by UPI' : m === 'CARD' ? 'by card' : m);

export default function PaymentsSection() {
  const queryClient = useQueryClient();
  const { data: profile } = useMemberProfile();
  const { data: fees, isLoading } = useQuery({
    queryKey: ['myFees', profile?.id],
    queryFn: () => getMyFees(profile?.id),
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });
  const { data: payConfig, isLoading: configLoading } = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: getPaymentConfig,
    refetchInterval: 60000,
  });
  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);

  const payNow = async (fee: any) => {
    if (payingFeeId) return;
    setPayingFeeId(fee.id);
    try {
      const checkout = await createCheckout(fee.id);
      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error('Payment gateway unavailable');
      const rzp = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Vajra Fitness',
        description: `Fee payment, ${formatPrice(fee.amount)}`,
        order_id: checkout.orderId,
        handler: async (response) => {
          try {
            await verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            queryClient.invalidateQueries({ queryKey: ['myFees', profile?.id] });
            queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
            queryClient.invalidateQueries({ queryKey: ['myNotifications'] });
          } catch {
            // Errors are surfaced by the global API interceptor.
          }
        },
      });
      rzp.open();
    } catch {
      // Errors (for example ONLINE_PAYMENTS_DISABLED) are surfaced by the interceptor.
    } finally {
      setPayingFeeId(null);
    }
  };

  return (
    <>
      <PageHeader title="Payments" description="Fees, due dates and receipts." />

      {configLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : !payConfig?.enabled ? (
        <p className="rounded-control bg-warning-soft p-4 text-sm text-warning-ink">
          Online payments are not set up for this gym yet. Pay at the front desk; receipts appear here once paid.
        </p>
      ) : (
        <p className="rounded-control bg-info-soft p-4 text-sm text-info-ink">
          You can pay any pending fee online with Razorpay using UPI, card or net banking.
        </p>
      )}

      {profile?.preferredPaymentMethod && (
        <p className="rounded-control bg-accent-soft p-4 text-sm text-ink">
          You chose to pay <b>{methodLabel(profile.preferredPaymentMethod)}</b>.{' '}
          {profile.preferredPaymentMethod === 'CASH'
            ? 'Settle your fee at the front desk once your membership is approved.'
            : 'A secure online payment link will be available here once your membership is approved.'}
        </p>
      )}

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !fees || fees.length === 0 ? (
        <Card><EmptyState icon={CreditCard} title="No payment history yet" /></Card>
      ) : (
        <ul className="space-y-3">
          {fees.map((fee: any) => (
            <li key={fee.id}>
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xl font-bold text-ink tabular-nums">{formatPrice(fee.amount)}</p>
                  <p className="text-sm text-ink-muted">Due {new Date(fee.dueDate).toLocaleDateString('en-IN')}</p>
                  {fee.paymentMethod && (
                    <p className="text-sm text-ink-muted">Paid via {fee.paymentMethod === 'ONLINE' ? 'Razorpay' : fee.paymentMethod}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={fee.status} tone={fee.status === 'PARTIAL' ? 'info' : undefined} />
                  {fee.status !== 'PAID' && payConfig?.enabled && (
                    <Button size="sm" icon={ExternalLink} loading={payingFeeId === fee.id} disabled={payingFeeId !== null} onClick={() => payNow(fee)}>
                      {payingFeeId === fee.id ? 'Starting' : 'Pay online'}
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" icon={Download} onClick={() => downloadFile(`/fees/${fee.id}/receipt`, `receipt-${fee.id.slice(0, 8)}.pdf`)}>
                    Receipt
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

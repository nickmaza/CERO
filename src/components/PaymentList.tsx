import { View } from 'react-native';

import type { Payment } from '@/lib/database.types';
import { METHOD_LABEL, PAYMENT_LABEL, formatDate } from '@/lib/format';
import { formatQ } from '@/lib/pay';

import { Badge, Body, Button, Card, EmptyState, IconCircle, Muted, colors, type IconName } from './ui';

export const PAYMENT_ICON: Record<string, IconName> = {
  salario: 'wallet-outline',
  bono14: 'sunny-outline',
  aguinaldo: 'gift-outline',
  vacaciones: 'airplane-outline',
  indemnizacion: 'document-text-outline',
  otro: 'cash-outline',
};

export function PaymentList({
  payments,
  onConfirm,
  confirmingId,
  delay = 0,
  emptyText = 'Cuando registres un pago, aparecerá aquí con su fecha y monto.',
}: {
  payments: Payment[];
  /** Shown to the worker: lets her confirm she received a payment. */
  onConfirm?: (p: Payment) => void;
  confirmingId?: string | null;
  delay?: number;
  emptyText?: string;
}) {
  if (payments.length === 0) return <EmptyState icon="receipt-outline" title="Sin pagos todavía" text={emptyText} />;
  return (
    <Card delay={delay}>
      {payments.map((p, i) => {
        const total = Number(p.amount) + Number(p.incentive_bonus);
        return (
          <View key={p.id} style={{ paddingVertical: 10, gap: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconCircle icon={PAYMENT_ICON[p.kind] ?? 'cash-outline'} tone={p.worker_confirmed_at ? 'sage' : 'brand'} size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Body style={{ fontWeight: '700' }}>{PAYMENT_LABEL[p.kind] ?? p.kind}</Body>
                <Muted>
                  {formatDate(p.paid_on)}
                  {p.method ? ` · ${METHOD_LABEL[p.method] ?? p.method}` : ''}
                </Muted>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Body style={{ fontWeight: '700' }}>{formatQ(total)}</Body>
                {p.worker_confirmed_at ? <Badge text="Recibido" tone="sage" icon="checkmark" /> : <Badge text="Sin confirmar" tone="honey" />}
              </View>
            </View>
            {Number(p.incentive_bonus) > 0 ? <Muted>Incluye {formatQ(Number(p.incentive_bonus))} de bonificación incentivo.</Muted> : null}
            {p.notes ? <Muted style={{ fontStyle: 'italic' }}>“{p.notes}”</Muted> : null}
            {onConfirm && !p.worker_confirmed_at ? (
              <Button title="Confirmar que lo recibí" icon="checkmark-circle-outline" variant="secondary" loading={confirmingId === p.id} onPress={() => onConfirm(p)} />
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';

import { PAYMENT_ICON } from '@/components/PaymentList';
import { useToast } from '@/components/Toast';
import { Banner, Button, Card, Choice, Columns, DateField, Field, FadeIn, Loading, MoneyField, Muted, Screen, colors, serif } from '@/components/ui';
import type { Employment } from '@/lib/database.types';
import { METHOD_LABEL, PAYMENT_LABEL, parseAmount, parseDMY, toDMY, todayGT } from '@/lib/format';
import { aguinaldo, bono14, formatQ, parseDate, toISO, vacationPay } from '@/lib/pay';
import { friendlyError, supabase } from '@/lib/supabase';
import { unwrap, useQuery } from '@/lib/useQuery';

type Kind = 'salario' | 'bono14' | 'aguinaldo' | 'vacaciones' | 'indemnizacion' | 'otro';
type Method = 'efectivo' | 'transferencia' | 'deposito' | 'otro';

/** Suggested amount and period for each kind of payment, based on the paid date. */
function suggestion(e: Employment, kind: Kind, paidOn: string): { amount: number; start?: string; end?: string; note: string } {
  const salary = Number(e.monthly_salary);
  const d = parseDate(paidOn);
  const y = d.getUTCFullYear();
  switch (kind) {
    case 'salario': {
      const start = toISO(new Date(Date.UTC(y, d.getUTCMonth(), 1)));
      const end = toISO(new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)));
      return { amount: salary, start, end, note: 'Salario del mes. La bonificación incentivo va en su propio campo.' };
    }
    case 'bono14': {
      // The most recent Bono 14 period that has ended (30 June).
      const endYear = d.getUTCMonth() >= 6 ? y : y - 1;
      const r = bono14(salary, e.start_date, `${endYear}-06-30`);
      return { amount: r.amount, start: r.periodStart, end: r.periodEnd, note: `Bono 14 del ${toDMY(r.periodStart)} al ${toDMY(r.periodEnd)}, ${r.daysWorked} días.` };
    }
    case 'aguinaldo': {
      // The most recent aguinaldo period that has ended (30 November).
      const endYear = d.getUTCMonth() === 11 ? y : y - 1;
      const r = aguinaldo(salary, e.start_date, `${endYear}-11-30`);
      return {
        amount: r.amount,
        start: r.periodStart,
        end: r.periodEnd,
        note: `Aguinaldo completo del período: ${formatQ(r.amount)}. Puedes pagar la mitad en diciembre y la otra mitad en enero.`,
      };
    }
    case 'vacaciones': {
      const r = vacationPay(salary, e.start_date, paidOn);
      return { amount: round(r.dailySalary * 15), note: '15 días de vacaciones a salario diario (salario ÷ 30).' };
    }
    default:
      return { amount: 0, note: '' };
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export default function RegisterPayment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { data: e, loading } = useQuery(
    async () => unwrap<Employment>(await supabase.from('employments').select('*').eq('id', id).single()),
    [id],
  );
  const [kind, setKind] = useState<Kind>('salario');
  const [paidOn, setPaidOn] = useState(toDMY(todayGT()));
  const [amount, setAmount] = useState('');
  const [incentive, setIncentive] = useState('');
  const [method, setMethod] = useState<Method>('efectivo');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paidIso = parseDMY(paidOn);
  const sug = useMemo(() => (e && paidIso ? suggestion(e, kind, paidIso) : null), [e, kind, paidIso]);

  // Prefill the amount whenever the kind of payment changes.
  useEffect(() => {
    if (!e) return;
    const s = suggestion(e, kind, parseDMY(paidOn) ?? todayGT());
    setAmount(s.amount ? s.amount.toFixed(2) : '');
    setIncentive(kind === 'salario' ? Number(e.incentive_bonus).toFixed(2) : '0');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e, kind]);

  if (loading && !e) return <Loading />;
  if (!e) return null;

  async function submit() {
    setError(null);
    const amt = parseAmount(amount);
    const inc = parseAmount(incentive || '0');
    if (!paidIso) return setError('Escribe la fecha de pago como DD/MM/AAAA.');
    if (amt === null || amt <= 0) return setError('Escribe un monto válido.');
    if (inc === null) return setError('Escribe un monto válido para la bonificación incentivo.');
    setBusy(true);
    const { error: err } = await supabase.from('payments').insert({
      employment_id: id,
      kind,
      amount: amt,
      incentive_bonus: inc,
      paid_on: paidIso,
      method,
      notes: notes.trim() || null,
      period_start: sug?.start ?? null,
      period_end: sug?.end ?? null,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err));
    toast(`Pago guardado: ${PAYMENT_LABEL[kind]}`);
    router.back();
  }

  const previewAmount = parseAmount(amount) ?? 0;
  const previewIncentive = kind === 'salario' ? parseAmount(incentive || '0') ?? 0 : 0;

  const preview = (
    <FadeIn>
      <Card style={{ alignItems: 'center', backgroundColor: colors.brandSoft, borderColor: colors.brandSoft }}>
        <Muted>Pago a {e.worker_name.split(' ')[0]}</Muted>
        <Text style={{ fontFamily: serif, fontSize: 44, fontWeight: '700', color: colors.brandDark }}>{formatQ(previewAmount + previewIncentive)}</Text>
        {sug?.note ? <Muted style={{ textAlign: 'center' }}>{sug.note}</Muted> : null}
      </Card>
    </FadeIn>
  );

  const form = (
    <>
      <Choice<Kind>
        label="¿Qué estás pagando?"
        value={kind}
        onChange={setKind}
        options={(Object.keys(PAYMENT_LABEL) as Kind[]).map((k) => ({ value: k, label: PAYMENT_LABEL[k], icon: PAYMENT_ICON[k] }))}
      />
      <MoneyField label="Monto" value={amount} onChangeText={setAmount} />
      {kind === 'salario' ? (
        <MoneyField label="Bonificación incentivo" value={incentive} onChangeText={setIncentive} hint="Q250 al mes por ley." />
      ) : null}
      <DateField label="Fecha de pago" value={paidOn} onChangeText={setPaidOn} />
      <Choice<Method>
        label="Forma de pago"
        value={method}
        onChange={setMethod}
        options={(Object.keys(METHOD_LABEL) as Method[]).map((m) => ({ value: m, label: METHOD_LABEL[m] }))}
      />
      <Field label="Nota (opcional)" value={notes} onChangeText={setNotes} multiline icon="chatbubble-outline" />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button title="Guardar pago" icon="checkmark" onPress={submit} loading={busy} />
      <Muted style={{ textAlign: 'center' }}>Ella podrá confirmar en su app que recibió este pago.</Muted>
    </>
  );

  return (
    <Screen>
      <Columns ratio={[2, 3]} left={preview} right={form} />
    </Screen>
  );
}

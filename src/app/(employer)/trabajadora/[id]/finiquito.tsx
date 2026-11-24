import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useToast } from '@/components/Toast';
import {
  Banner,
  Body,
  Button,
  Card,
  Choice,
  Columns,
  DateField,
  Divider,
  Field,
  Hero,
  HeroText,
  IconCircle,
  Loading,
  MoneyField,
  Muted,
  Screen,
  SectionLabel,
  type IconName,
} from '@/components/ui';
import type { Employment } from '@/lib/database.types';
import { parseAmount, parseDMY, toDMY, todayGT } from '@/lib/format';
import { END_REASON_LABEL, formatQ, settlement, type EndReason, type SettlementLine } from '@/lib/pay';
import { friendlyError, supabase } from '@/lib/supabase';
import { useLayout } from '@/lib/useLayout';
import { unwrap, useQuery } from '@/lib/useQuery';

const LINE_ICON: Record<SettlementLine['key'], IconName> = {
  aguinaldo: 'gift-outline',
  bono14: 'sunny-outline',
  vacaciones: 'airplane-outline',
  indemnizacion: 'document-text-outline',
};

export default function Settlement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { isDesktop } = useLayout();
  const { data: e, loading } = useQuery(
    async () => unwrap<Employment>(await supabase.from('employments').select('*').eq('id', id).single()),
    [id],
  );
  const [lastDay, setLastDay] = useState(toDMY(todayGT()));
  const [reason, setReason] = useState<EndReason>('renuncia');
  const [average, setAverage] = useState<string | null>(null);
  const [pendingVacation, setPendingVacation] = useState('0');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading && !e) return <Loading />;
  if (!e) return null;

  const salary = Number(e.monthly_salary);
  const lastIso = parseDMY(lastDay);
  const avg = parseAmount(average ?? String(salary));
  const pending = Number(pendingVacation.replace(',', '.'));
  const valid = !!lastIso && lastIso >= e.start_date && avg !== null && Number.isFinite(pending) && pending >= 0;
  const result = valid
    ? settlement({
        monthlySalary: salary,
        averageSalaryLast6Months: avg!,
        employmentStart: e.start_date,
        lastDayWorked: lastIso!,
        reason,
        pendingVacationDays: pending,
      })
    : null;

  async function endEmployment() {
    if (!lastIso) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('employments').update({ status: 'ended', end_date: lastIso, end_reason: reason }).eq('id', id);
    setBusy(false);
    if (err) return setError(friendlyError(err));
    toast('Relación laboral terminada', 'info');
    router.back();
  }

  const total = (
    <>
      {result ? (
        <Hero tone="sage">
          <HeroText size={15} style={{ opacity: 0.9, letterSpacing: 0.5 }}>
            TOTAL DEL FINIQUITO
          </HeroText>
          <HeroText size={42} bold>
            {formatQ(result.total)}
          </HeroText>
          <HeroText size={16} style={{ opacity: 0.95 }}>
            Para {e.worker_name}, con último día el {lastDay}.
          </HeroText>
        </Hero>
      ) : (
        <Banner tone="warn">Revisa la fecha (DD/MM/AAAA, no antes del inicio) y los montos.</Banner>
      )}
    </>
  );
  const detail = (
    <>
      {result ? (
        <>
          <SectionLabel>El detalle</SectionLabel>
          <Card>
            {result.lines.map((l, i) => (
              <View key={l.key}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
                  <IconCircle icon={LINE_ICON[l.key]} tone={l.key === 'indemnizacion' ? 'brand' : 'sage'} size={40} />
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: '700' }}>{l.label}</Body>
                    <Muted>{l.detail}</Muted>
                  </View>
                  <Body style={{ fontWeight: '700' }}>{formatQ(l.amount)}</Body>
                </View>
              </View>
            ))}
          </Card>
          <Muted>
            Además, paga los días de salario trabajados que aún no hayas pagado, y cualquier aguinaldo o Bono 14 de un período anterior que siga
            pendiente. La indemnización solo aplica a un despido sin causa justificada. Este cálculo es una guía; si tienes dudas, consulta a un
            abogado laboral.
          </Muted>
        </>
      ) : null}
    </>
  );
  const fields = (
    <>
      <DateField label="Último día de trabajo" value={lastDay} onChangeText={setLastDay} />
      <Choice<EndReason>
        label="Motivo"
        value={reason}
        onChange={setReason}
        options={(Object.keys(END_REASON_LABEL) as EndReason[]).map((r) => ({ value: r, label: END_REASON_LABEL[r] }))}
      />
      {reason === 'despido_injustificado' ? (
        <MoneyField
          label="Salario promedio de los últimos 6 meses"
          value={average ?? String(salary)}
          onChangeText={setAverage}
          hint="Sin la bonificación incentivo. Si no cambió, deja el salario actual."
        />
      ) : null}
      <Field
        label="Días de vacaciones de años anteriores sin tomar"
        value={pendingVacation}
        onChangeText={setPendingVacation}
        keyboardType="decimal-pad"
        icon="airplane-outline"
        hint="Las del año en curso ya se calculan solas."
      />
    </>
  );
  const finish = (
    <>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {e.status === 'active' ? (
        confirming ? (
          <Card>
            <Body>¿Terminar la relación con {e.worker_name}? Seguirás viendo su historial de pagos.</Body>
            <Button title="Sí, terminar relación" icon="checkmark" variant="danger" onPress={endEmployment} loading={busy} disabled={!valid} />
            <Button title="Cancelar" variant="ghost" onPress={() => setConfirming(false)} />
          </Card>
        ) : (
          <Button title="Terminar relación laboral" icon="exit-outline" variant="danger" onPress={() => setConfirming(true)} disabled={!valid} />
        )
      ) : null}
    </>
  );

  // Phone: total first, then the questions, then the detail. Computer: questions on the left, live result on the right.
  return (
    <Screen>
      {isDesktop ? (
        <Columns
          ratio={[1, 1]}
          left={
            <>
              {fields}
              {finish}
            </>
          }
          right={
            <>
              {total}
              {detail}
            </>
          }
        />
      ) : (
        <>
          {total}
          {fields}
          {detail}
          {finish}
        </>
      )}
    </Screen>
  );
}

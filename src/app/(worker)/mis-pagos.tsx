import { useState } from 'react';
import { View } from 'react-native';

import { NextObligationHero, ObligationList } from '@/components/ObligationList';
import { PaymentList } from '@/components/PaymentList';
import { useToast } from '@/components/Toast';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Columns,
  Divider,
  EmptyState,
  FadeIn,
  Field,
  IconCircle,
  Loading,
  Muted,
  Row,
  Screen,
  SectionLabel,
  Subtitle,
  Title,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Employment, Payment, Profile } from '@/lib/database.types';
import { JOB_LABEL, formatDate, greeting, todayGT } from '@/lib/format';
import { MINIMUM_WAGE_2026, formatQ, upcomingObligations } from '@/lib/pay';
import { friendlyError, supabase } from '@/lib/supabase';
import { unwrap, useQuery } from '@/lib/useQuery';

interface Job {
  employment: Employment;
  employer: Pick<Profile, 'full_name'> | null;
  payments: Payment[];
}

export default function WorkerHome() {
  const { profile } = useAuth();
  const toast = useToast();
  const { data, error, loading, refetch, refresh, refreshing } = useQuery(async (): Promise<Job[]> => {
    const emps = unwrap<Employment[]>(
      await supabase.from('employments').select('*').eq('worker_user_id', profile!.id).order('start_date', { ascending: false }),
    );
    if (emps.length === 0) return [];
    const [employers, pays] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', [...new Set(emps.map((e) => e.employer_id))]),
      supabase.from('payments').select('*').in('employment_id', emps.map((e) => e.id)).order('paid_on', { ascending: false }),
    ]);
    const employerRows = unwrap<Pick<Profile, 'id' | 'full_name'>[]>(employers);
    const paymentRows = unwrap<Payment[]>(pays);
    return emps.map((e) => ({
      employment: e,
      employer: employerRows.find((p) => p.id === e.employer_id) ?? null,
      payments: paymentRows.filter((p) => p.employment_id === e.id),
    }));
  });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  const jobs = data ?? [];
  const firstName = profile?.full_name.split(' ')[0] ?? '';
  const today = todayGT();
  const next = jobs
    .filter((j) => j.employment.status === 'active')
    .flatMap((j) => upcomingObligations(Number(j.employment.monthly_salary), j.employment.start_date, today))
    .sort((a, b) => a.daysUntil - b.daysUntil)[0];

  async function confirm(p: Payment) {
    setActionError(null);
    setConfirmingId(p.id);
    const { error: err } = await supabase.rpc('confirm_payment', { payment_id: p.id });
    setConfirmingId(null);
    if (err) return setActionError(friendlyError(err));
    toast('¡Listo! Pago confirmado');
    await refetch();
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <FadeIn style={{ gap: 2 }}>
        <Title>
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </Title>
        <Muted style={{ fontSize: 17 }}>Aquí ves tus pagos y lo que te corresponde por ley.</Muted>
      </FadeIn>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {actionError ? <Banner tone="danger">{actionError}</Banner> : null}

      {jobs.length === 0 ? (
        <Columns
          ratio={[1, 1]}
          left={
            <EmptyState
              icon="key-outline"
              title="Conecta con tu empleador(a)"
              text="Pídele el código de CERO de 6 letras y números. Con él verás tus pagos y podrás confirmar cada uno."
            >
              <ClaimCode onClaimed={refetch} />
            </EmptyState>
          }
          right={<Rights />}
        />
      ) : (
        <Columns
          ratio={[3, 2]}
          left={
            <>
              {next ? <NextObligationHero item={{ ...next, label: `Te toca: ${next.label}` }} delay={80} /> : null}
              {jobs.map((j, i) => (
                <JobSection key={j.employment.id} job={j} onConfirm={confirm} confirmingId={confirmingId} delay={140 + i * 60} />
              ))}
            </>
          }
          right={
            <>
              <Rights />
              <SectionLabel>¿Trabajas en otra casa?</SectionLabel>
              <Card>
                <ClaimCode onClaimed={refetch} />
              </Card>
            </>
          }
        />
      )}
    </Screen>
  );
}

function Rights() {
  return (
    <>
      <SectionLabel>Tus derechos en 2026</SectionLabel>
      <Card>
        <Right icon="cash-outline" title="Salario mínimo, tiempo completo" value={formatQ(MINIMUM_WAGE_2026.CE1)} />
        <Muted>Departamento de Guatemala. En el resto del país: {formatQ(MINIMUM_WAGE_2026.CE2)}. Más Q250 de bonificación incentivo.</Muted>
        <Divider />
        <Right icon="sunny-outline" title="Bono 14" value="1 salario en julio" />
        <Right icon="gift-outline" title="Aguinaldo" value="1 salario, dic. y enero" />
        <Right icon="airplane-outline" title="Vacaciones" value="15 días por año" />
        <Muted>Si trabajaste menos de un año, te corresponde la parte proporcional.</Muted>
      </Card>
    </>
  );
}

function Right({ icon, title, value }: { icon: 'cash-outline' | 'sunny-outline' | 'gift-outline' | 'airplane-outline'; title: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <IconCircle icon={icon} tone="sage" size={38} />
      <View style={{ flex: 1 }}>
        <Row label={title} value={value} />
      </View>
    </View>
  );
}

function JobSection({ job, onConfirm, confirmingId, delay }: { job: Job; onConfirm: (p: Payment) => void; confirmingId: string | null; delay: number }) {
  const e = job.employment;
  const salary = Number(e.monthly_salary);
  const active = e.status === 'active';
  const employerName = job.employer?.full_name || 'Tu empleador(a)';
  return (
    <>
      <SectionLabel>Casa de {employerName.split(' ')[0]}</SectionLabel>
      <Card delay={delay}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={employerName} />
          <View style={{ flex: 1 }}>
            <Subtitle style={{ fontSize: 19 }}>{employerName}</Subtitle>
            <Muted>
              {JOB_LABEL[e.job_type] ?? e.job_type} · desde {formatDate(e.start_date)}
              {!active && e.end_date ? ` hasta ${formatDate(e.end_date)}` : ''}
            </Muted>
          </View>
        </View>
        <Divider />
        <Row label="Salario mensual" value={formatQ(salary)} icon="cash-outline" />
        <Row label="Bonificación incentivo" value={formatQ(Number(e.incentive_bonus))} icon="add-circle-outline" />
        <Row label="Total al mes" value={formatQ(salary + Number(e.incentive_bonus))} strong />
      </Card>
      {active ? <ObligationList items={upcomingObligations(salary, e.start_date, todayGT())} delay={delay + 40} /> : null}
      <PaymentList
        payments={job.payments}
        onConfirm={onConfirm}
        confirmingId={confirmingId}
        delay={delay + 80}
        emptyText="Cuando tu empleador(a) registre un pago, aparecerá aquí para que lo confirmes."
      />
    </>
  );
}

function ClaimCode({ onClaimed }: { onClaimed: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setError(null);
    if (code.trim().length !== 6) return setError('El código tiene 6 letras y números.');
    setBusy(true);
    const { error: err } = await supabase.rpc('claim_employment', { code: code.trim() });
    setBusy(false);
    if (err) return setError(friendlyError(err));
    setCode('');
    toast('¡Conectada! Ya puedes ver tus pagos');
    onClaimed();
  }

  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Código de tu empleador(a)"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        autoCapitalize="characters"
        placeholder="ABC123"
        icon="key-outline"
        maxLength={6}
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button title="Conectar" icon="link-outline" onPress={claim} loading={busy} />
    </View>
  );
}

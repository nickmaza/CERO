import { router } from 'expo-router';
import { View } from 'react-native';

import { NextObligationHero, ObligationList } from '@/components/ObligationList';
import {
  Avatar,
  Badge,
  Banner,
  Body,
  Button,
  Card,
  Columns,
  EmptyState,
  FadeIn,
  Grid,
  Ionicons,
  Loading,
  Muted,
  Screen,
  SectionLabel,
  Subtitle,
  Title,
  colors,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Employment } from '@/lib/database.types';
import { JOB_LABEL, greeting, todayGT } from '@/lib/format';
import { checkMinimumWage, formatQ, upcomingObligations, type EconomicZone } from '@/lib/pay';
import { supabase } from '@/lib/supabase';
import { useLayout } from '@/lib/useLayout';
import { unwrap, useQuery } from '@/lib/useQuery';

export default function EmployerHome() {
  const { profile } = useAuth();
  const { isDesktop } = useLayout();
  const { data, error, loading, refresh, refreshing } = useQuery(async () =>
    unwrap<Employment[]>(
      await supabase.from('employments').select('*').eq('employer_id', profile!.id).order('created_at', { ascending: true }),
    ),
  );

  if (loading && !data) return <Loading />;

  const all = data ?? [];
  const active = all.filter((e) => e.status === 'active');
  const ended = all.filter((e) => e.status === 'ended');
  const today = todayGT();
  const upcoming = active
    .flatMap((e) => upcomingObligations(Number(e.monthly_salary), e.start_date, today).map((o) => ({ ...o, workerName: e.worker_name })))
    .sort((a, b) => a.daysUntil - b.daysUntil);
  const firstName = profile?.full_name.split(' ')[0] ?? '';
  const monthly = active.reduce((s, e) => s + Number(e.monthly_salary) + Number(e.incentive_bonus), 0);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <FadeIn style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Title style={isDesktop ? { fontSize: 36 } : null}>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </Title>
          <Muted style={{ fontSize: 17 }}>{active.length > 0 ? 'Así va la planilla de tu hogar.' : 'Empecemos a poner todo en orden.'}</Muted>
        </View>
        {isDesktop && active.length > 0 ? (
          <View style={{ width: 260 }}>
            <Button title="Agregar trabajadora" icon="person-add-outline" onPress={() => router.push('/trabajadora/nueva')} />
          </View>
        ) : null}
      </FadeIn>
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {active.length === 0 ? (
        <EmptyState
          icon="home-outline"
          title="Agrega a tu trabajadora"
          text="Con su salario y fecha de inicio, CERO calcula su Bono 14, aguinaldo, vacaciones e indemnización, y te avisa antes de cada pago."
        >
          <Button title="Agregar trabajadora" icon="person-add-outline" onPress={() => router.push('/trabajadora/nueva')} />
        </EmptyState>
      ) : (
        <>
          <Columns
            ratio={[5, 4]}
            left={upcoming[0] ? <NextObligationHero item={upcoming[0]} who={active.length > 1} delay={80} /> : null}
            right={
              upcoming.length > 1 ? (
                <View style={{ gap: 14 }}>
                  <SectionLabel>Después</SectionLabel>
                  <ObligationList items={upcoming.slice(1, 4)} who={active.length > 1} delay={140} />
                </View>
              ) : null
            }
          />

          <SectionLabel action={<Muted>{formatQ(monthly)} al mes</Muted>}>Tu equipo</SectionLabel>
          <Grid minWidth={320}>
            {active.map((e, i) => (
              <WorkerCard key={e.id} e={e} delay={200 + i * 60} />
            ))}
          </Grid>
          {!isDesktop ? (
            <Button title="Agregar otra persona" icon="person-add-outline" variant="secondary" onPress={() => router.push('/trabajadora/nueva')} />
          ) : null}
        </>
      )}

      {ended.length > 0 ? (
        <>
          <SectionLabel>Relaciones terminadas</SectionLabel>
          <Grid minWidth={320}>
            {ended.map((e) => (
              <WorkerCard key={e.id} e={e} />
            ))}
          </Grid>
        </>
      ) : null}
    </Screen>
  );
}

function WorkerCard({ e, delay = 0 }: { e: Employment; delay?: number }) {
  const wage = checkMinimumWage(Number(e.monthly_salary), e.economic_zone as EconomicZone, e.days_per_week);
  const active = e.status === 'active';
  return (
    <Card delay={delay} onPress={() => router.push({ pathname: '/trabajadora/[id]', params: { id: e.id } })} accessibilityLabel={e.worker_name}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={e.worker_name} />
        <View style={{ flex: 1, gap: 2 }}>
          <Subtitle style={{ fontSize: 19 }}>{e.worker_name}</Subtitle>
          <Muted>
            {JOB_LABEL[e.job_type] ?? e.job_type} · {e.days_per_week} {e.days_per_week === 1 ? 'día' : 'días'} por semana
          </Muted>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Body style={{ fontWeight: '700' }}>{formatQ(Number(e.monthly_salary) + Number(e.incentive_bonus))}</Body>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
      </View>
      {active ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {wage.status === 'below' ? <Badge text="Bajo el mínimo" tone="warn" icon="alert-circle-outline" /> : null}
          {e.worker_user_id ? <Badge text="Conectada" tone="sage" icon="link-outline" /> : <Badge text="Sin conectar" tone="honey" icon="link-outline" />}
        </View>
      ) : (
        <Badge text="Terminada" tone="brand" />
      )}
    </Card>
  );
}

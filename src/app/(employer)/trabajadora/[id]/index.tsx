import * as Clipboard from 'expo-clipboard';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Linking, Share, StyleSheet, Text, View } from 'react-native';

import { ObligationList } from '@/components/ObligationList';
import { PaymentList } from '@/components/PaymentList';
import { useToast } from '@/components/Toast';
import {
  ActionTile,
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  Columns,
  Divider,
  FadeIn,
  IconCircle,
  Loading,
  Muted,
  Row,
  Screen,
  SectionLabel,
  Subtitle,
  Title,
  colors,
  serif,
} from '@/components/ui';
import type { Employment, Payment } from '@/lib/database.types';
import { JOB_LABEL, formatDate, formatInviteCode, todayGT } from '@/lib/format';
import { END_REASON_LABEL, ZONE_LABEL, checkMinimumWage, formatQ, upcomingObligations, type EconomicZone, type EndReason } from '@/lib/pay';
import { friendlyError, supabase } from '@/lib/supabase';
import { useLayout } from '@/lib/useLayout';
import { unwrap, useQuery } from '@/lib/useQuery';

// IGSS's official PRECAPI brochure: requirements and enrollment steps.
const PRECAPI_URL = 'https://www.igssgt.org/wp-content/uploads/2025/01/Trifoliar-Programa-PRECAPI-IGSS-rev-2025.pdf';

export default function WorkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { isDesktop } = useLayout();
  const { data, error, loading, refresh, refreshing } = useQuery(async () => {
    const [emp, pays] = await Promise.all([
      supabase.from('employments').select('*').eq('id', id).single(),
      supabase.from('payments').select('*').eq('employment_id', id).order('paid_on', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    return { employment: unwrap<Employment>(emp), payments: unwrap<Payment[]>(pays) };
  }, [id]);

  if (loading && !data) return <Loading />;
  if (!data) return <Screen>{error ? <Banner tone="danger">{error}</Banner> : null}</Screen>;

  const e = data.employment;
  const firstName = e.worker_name.split(' ')[0];
  const salary = Number(e.monthly_salary);
  const active = e.status === 'active';
  const wage = checkMinimumWage(salary, e.economic_zone as EconomicZone, e.days_per_week);
  const upcoming = active ? upcomingObligations(salary, e.start_date, todayGT()) : [];
  const go = (path: '/trabajadora/[id]/pago' | '/trabajadora/[id]/editar' | '/trabajadora/[id]/finiquito') => router.push({ pathname: path, params: { id } });

  const code = formatInviteCode(e.invite_code);

  async function copyCode() {
    await Clipboard.setStringAsync(code);
    toast('Código copiado');
  }

  // Issues a new code; the old one stops working. Useful if it was sent to the wrong person.
  async function resetCode() {
    const { error: err } = await supabase.rpc('reset_invite_code', { employment_id: e.id });
    if (err) return toast(friendlyError(err), 'warn');
    toast('Nuevo código listo; el anterior ya no funciona');
    await refresh();
  }

  async function shareInvite() {
    await Share.share({
      message:
        `Hola ${firstName}, registré tu trabajo en CERO para llevar tus pagos en orden. ` +
        `Descarga la app, crea tu cuenta como trabajadora y escribe este código: ${code}`,
    });
  }

  const header = (
    <FadeIn style={isDesktop ? styles.headerDesktop : styles.header}>
      <Avatar name={e.worker_name} size={isDesktop ? 88 : 76} />
      <View style={{ gap: 6, alignItems: isDesktop ? 'flex-start' : 'center', flexShrink: 1 }}>
        <Title style={{ textAlign: isDesktop ? 'left' : 'center', fontSize: isDesktop ? 34 : 30 }}>{e.worker_name}</Title>
        <Muted style={{ fontSize: 17 }}>
          {JOB_LABEL[e.job_type] ?? e.job_type} · desde {formatDate(e.start_date)}
        </Muted>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: isDesktop ? 'flex-start' : 'center' }}>
          {active ? <Badge text="Activa" tone="sage" icon="ellipse" /> : <Badge text="Terminada" tone="brand" />}
          {e.worker_user_id ? <Badge text="Conectada a CERO" tone="sage" icon="link-outline" /> : null}
          {e.igss_precapi ? <Badge text="IGSS" tone="sage" icon="shield-checkmark-outline" /> : null}
        </View>
      </View>
    </FadeIn>
  );

  const actions = active ? (
    <FadeIn delay={80} style={[{ flexDirection: 'row', gap: 10 }, isDesktop ? { width: 480 } : null]}>
      <ActionTile icon="wallet-outline" label="Registrar pago" onPress={() => go('/trabajadora/[id]/pago')} />
      <ActionTile icon="create-outline" label="Editar datos" tone="honey" onPress={() => go('/trabajadora/[id]/editar')} />
      <ActionTile icon="calculator-outline" label="Finiquito" tone="sage" onPress={() => go('/trabajadora/[id]/finiquito')} />
    </FadeIn>
  ) : (
    <View style={isDesktop ? { width: 360 } : null}>
      <Button title="Registrar pago del finiquito" icon="wallet-outline" onPress={() => go('/trabajadora/[id]/pago')} />
    </View>
  );

  const endedBanner =
    !active && e.end_date ? (
      <Banner tone="info">
        Relación terminada el {formatDate(e.end_date)}
        {e.end_reason ? ` · ${END_REASON_LABEL[e.end_reason as EndReason]}` : ''}.
      </Banner>
    ) : null;

  const left = (
    <>
      <Card delay={120}>
        <Row label="Salario mensual" value={formatQ(salary)} icon="cash-outline" />
        <Row label="Bonificación incentivo" value={formatQ(Number(e.incentive_bonus))} icon="add-circle-outline" />
        <Divider />
        <Row label="Total al mes" value={formatQ(salary + Number(e.incentive_bonus))} strong />
        <Divider />
        <Row label="Días por semana" value={`${e.days_per_week}${e.live_in ? ' · de planta' : ''}`} icon="calendar-outline" />
        <Row label="Zona" value={ZONE_LABEL[e.economic_zone as EconomicZone]} icon="location-outline" />
      </Card>

      {active && wage.status === 'below' ? (
        <Banner tone="warn">
          El salario está {formatQ(wage.shortfall)} por debajo del mínimo 2026 ({formatQ(wage.minimum)}). Pagar menos del mínimo puede terminar
          en una demanda laboral.
        </Banner>
      ) : null}

      {active ? (
        <>
          <SectionLabel>Lo que viene</SectionLabel>
          <ObligationList items={upcoming} delay={160} />
        </>
      ) : null}
    </>
  );

  const right = (
    <>
      {active && !e.worker_user_id ? (
        <>
          <SectionLabel>Conecta a {firstName}</SectionLabel>
          <Card delay={200}>
            <Muted>Comparte este código. Cuando lo escriba en su app, verá sus pagos y podrá confirmar cada uno.</Muted>
            <View style={styles.codeBox}>
              <Text selectable style={styles.code}>
                {code}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title="Copiar" icon="copy-outline" variant="secondary" onPress={copyCode} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Compartir" icon="share-social-outline" onPress={shareInvite} />
              </View>
            </View>
            <Muted style={{ textAlign: 'center' }}>Compártelo solo con {firstName}. Sirve una sola vez.</Muted>
            <Button title="Cambiar código" icon="refresh-outline" variant="ghost" onPress={resetCode} />
          </Card>
        </>
      ) : null}

      {active && !e.igss_precapi && e.economic_zone === 'CE1' ? (
        <Card delay={240} onPress={() => Linking.openURL(PRECAPI_URL)} accessibilityLabel="Ver cómo inscribirla en el IGSS">
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <IconCircle icon="shield-checkmark-outline" tone="sage" size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <Subtitle style={{ fontSize: 18 }}>Protégela con el IGSS</Subtitle>
              <Muted>El PRECAPI cubre maternidad, accidentes y control del niño sano. Toca para ver cómo inscribirla.</Muted>
            </View>
          </View>
        </Card>
      ) : null}

      <SectionLabel>Historial de pagos</SectionLabel>
      <PaymentList payments={data.payments} delay={260} />
    </>
  );

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Stack.Screen options={{ title: '' }} />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {isDesktop ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          {header}
          {actions}
        </View>
      ) : (
        header
      )}
      {endedBanner}
      {isDesktop ? null : actions}
      <Columns ratio={[1, 1]} left={left} right={right} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 6, paddingTop: 4, paddingBottom: 4 },
  headerDesktop: { flexDirection: 'row', alignItems: 'center', gap: 20, flexShrink: 1 },
  codeBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    borderRadius: 18,
    backgroundColor: colors.brandSoft,
    paddingVertical: 16,
    marginVertical: 6,
  },
  code: { fontFamily: serif, fontSize: 36, fontWeight: '700', letterSpacing: 4, color: colors.brandDark, textAlign: 'center' },
});

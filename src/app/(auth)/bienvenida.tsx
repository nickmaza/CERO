import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthShell } from '@/components/AuthShell';
import { Button, Card, FadeIn, Hero, HeroText, IconCircle, Ionicons, Muted, Subtitle, Title, Wordmark, colors, type IconName } from '@/components/ui';
import { useLayout } from '@/lib/useLayout';

export default function Welcome() {
  const { isDesktop } = useLayout();
  const choices = (
    <>
      <Subtitle style={{ marginTop: 8 }}>¿Cómo vas a usar CERO?</Subtitle>
      <RoleCard
        delay={220}
        icon="home"
        tone="brand"
        title="Tengo una trabajadora en casa"
        text="Lleva sus pagos, recibe recordatorios y evita sorpresas."
        onPress={() => router.push({ pathname: '/sign-up', params: { role: 'employer' } })}
      />
      <RoleCard
        delay={300}
        icon="sparkles"
        tone="sage"
        title="Trabajo en una casa"
        text="Mira tus pagos y lo que te corresponde por ley."
        onPress={() => router.push({ pathname: '/sign-up', params: { role: 'worker' } })}
      />
      <FadeIn delay={380}>
        <Button title="Ya tengo cuenta" variant="ghost" onPress={() => router.push('/sign-in')} />
      </FadeIn>
    </>
  );

  // On a computer the brand story sits in the left panel, so the right side only asks who you are.
  if (isDesktop) {
    return (
      <AuthShell>
        <Title>Te damos la bienvenida</Title>
        {choices}
      </AuthShell>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <FadeIn style={styles.brand}>
          <Wordmark size={52} />
          <Muted style={{ textAlign: 'center', fontSize: 17 }}>La planilla de tu hogar, en orden.</Muted>
        </FadeIn>

        <Hero delay={120}>
          <HeroText size={26} bold>
            Cero estrés, cero sorpresas.
          </HeroText>
          <HeroText size={17} style={{ opacity: 0.95, lineHeight: 24 }}>
            Salario, Bono 14, aguinaldo, vacaciones e indemnización, calculados según la ley de Guatemala.
          </HeroText>
          <View style={styles.heroIcons}>
            {(['calendar', 'cash', 'shield-checkmark', 'heart'] as IconName[]).map((i) => (
              <View key={i} style={styles.heroIcon}>
                <Ionicons name={i} size={20} color={colors.white} />
              </View>
            ))}
          </View>
        </Hero>

        {choices}
      </ScrollView>
    </SafeAreaView>
  );
}

function RoleCard(props: { icon: IconName; tone: 'brand' | 'sage'; title: string; text: string; onPress: () => void; delay: number }) {
  return (
    <Card onPress={props.onPress} delay={props.delay} accessibilityLabel={props.title}>
      <View style={styles.roleRow}>
        <IconCircle icon={props.icon} tone={props.tone} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Subtitle style={{ fontSize: 19 }}>{props.title}</Subtitle>
          <Muted>{props.text}</Muted>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.muted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 20, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center', flexGrow: 1, justifyContent: 'center' },
  brand: { alignItems: 'center', gap: 4, marginBottom: 6 },
  heroIcons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  heroIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});

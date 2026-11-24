import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLayout } from '@/lib/useLayout';

import { FadeIn, Screen, Wordmark, colors, serif, type IconName } from './ui';

const FEATURES: { icon: IconName; text: string }[] = [
  { icon: 'calendar', text: 'Recordatorios antes del Bono 14 y el aguinaldo' },
  { icon: 'cash', text: 'Montos exactos según la ley de Guatemala' },
  { icon: 'shield-checkmark', text: 'Pagos confirmados por la trabajadora' },
  { icon: 'heart', text: 'Una relación laboral clara y justa' },
];

/**
 * Sign-in and sign-up screens. On a computer: a warm brand panel on the left and the
 * form on the right. On a phone: the form alone, as before.
 */
export function AuthShell({ children, back = false }: { children: ReactNode; /** Shows a "Volver" link (the header is hidden on computers). */ back?: boolean }) {
  const { isDesktop } = useLayout();
  if (!isDesktop) return <Screen>{children}</Screen>;
  return (
    <View style={styles.row}>
      <LinearGradient colors={['#D98A63', '#B95F3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.panel}>
        <FadeIn style={{ gap: 18, maxWidth: 460 }}>
          <Wordmark size={60} color={colors.white} />
          <Text style={styles.headline}>Cero estrés, cero sorpresas.</Text>
          <Text style={styles.lead}>La planilla de tu hogar en orden: salario, Bono 14, aguinaldo, vacaciones e indemnización.</Text>
          <View style={{ gap: 14, marginTop: 10 }}>
            {FEATURES.map((f) => (
              <View key={f.icon} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={20} color={colors.white} />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </FadeIn>
      </LinearGradient>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formWrap} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {back ? (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/bienvenida'))}
              accessibilityRole="link"
              accessibilityLabel="Volver"
              style={styles.back}
            >
              <Ionicons name="arrow-back" size={18} color={colors.brand} />
              <Text style={styles.backText}>Volver</Text>
            </Pressable>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  panel: { flex: 1, justifyContent: 'center', paddingHorizontal: 64, paddingVertical: 48 },
  headline: { fontFamily: serif, fontSize: 44, fontWeight: '700', color: colors.white, lineHeight: 52 },
  lead: { fontFamily: serif, fontSize: 20, lineHeight: 29, color: colors.white, opacity: 0.95 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  featureText: { fontFamily: serif, fontSize: 18, color: colors.white, flexShrink: 1 },
  formWrap: { flexGrow: 1, justifyContent: 'center', padding: 48 },
  form: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 4 },
  backText: { fontFamily: serif, fontSize: 16, fontWeight: '700', color: colors.brand },
});

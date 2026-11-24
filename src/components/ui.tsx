import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useLayout } from '@/lib/useLayout';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ------------------------------------------------------------------ Theme

/** Soft, warm palette: cream paper, terracotta, honey and sage. */
export const colors = {
  bg: '#FBF6EF',
  card: '#FFFDF9',
  ink: '#3B2C25',
  muted: '#8A786D',
  line: '#EEE2D6',
  brand: '#C46A44',
  brandDark: '#9C4F2E',
  brandSoft: '#F8E6DA',
  honey: '#E3A548',
  honeySoft: '#FBEFD7',
  sage: '#6C8A5E',
  sageSoft: '#E7EFDF',
  warn: '#A0601F',
  warnSoft: '#FCECD4',
  danger: '#B0463A',
  dangerSoft: '#F8DFDA',
  white: '#FFFFFF',
};

/** Times New Roman where the phone has it; Android has no Times New Roman, so it uses its built-in serif. */
export const serif = Platform.select({
  ios: 'Times New Roman',
  android: 'serif',
  default: '"Times New Roman", Times, serif',
}) as string;

export const shadow: ViewStyle = Platform.select({
  web: { boxShadow: '0 6px 20px rgba(120, 72, 40, 0.08)' } as ViewStyle,
  default: {
    shadowColor: '#7A4A2A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
}) as ViewStyle;

// Native driver isn't available on web; Animated falls back to JS there.
const nativeDriver = Platform.OS !== 'web';

// ------------------------------------------------------------------ Layout

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  narrow = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** On a computer, keep single-column forms at a comfortable reading width. */
  narrow?: boolean;
}) {
  const { isDesktop } = useLayout();
  const contentStyle = [styles.content, isDesktop && (narrow ? styles.contentDesktopNarrow : styles.contentDesktop)];
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[contentStyle, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/**
 * Two columns side by side on a computer; on a phone, the left content then the right,
 * stacked exactly as before.
 */
export function Columns({ left, right, ratio = [1, 1] }: { left: ReactNode; right: ReactNode; ratio?: [number, number] }) {
  const { isDesktop } = useLayout();
  if (!isDesktop) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }
  return (
    <View style={styles.columns}>
      <View style={[styles.column, { flex: ratio[0] }]}>{left}</View>
      <View style={[styles.column, { flex: ratio[1] }]}>{right}</View>
    </View>
  );
}

/** Cards in a grid on a computer (as many as fit, each at least `minWidth` wide); stacked on a phone. */
export function Grid({ children, minWidth = 300 }: { children: ReactNode[]; minWidth?: number }) {
  const { isDesktop } = useLayout();
  if (!isDesktop) return <>{children}</>;
  return (
    <View style={styles.grid}>
      {children.map((child, i) => (
        <View key={i} style={{ flexGrow: 1, flexBasis: minWidth, maxWidth: Math.max(minWidth * 1.75, 520) }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** Slides content up gently as it appears; `delay` staggers lists. */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start();
  }, [anim, delay]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A pressable that shrinks slightly under the finger, with a light tap vibration. */
export function PressableScale({
  children,
  onPress,
  style,
  disabled,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  haptics = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'radio' | 'link';
  accessibilityState?: { selected?: boolean; disabled?: boolean; busy?: boolean };
  haptics?: boolean;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: nativeDriver, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      onPress={() => {
        if (haptics) haptic.tap();
        onPress?.();
      }}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      // On a computer, cards and buttons lift slightly under the mouse.
      onHoverIn={() => !disabled && to(1.02)}
      onHoverOut={() => to(1)}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={Platform.OS === 'web' ? ({ cursor: disabled ? 'default' : 'pointer' } as ViewStyle) : undefined}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ Type

export function Wordmark({ size = 44, color = colors.brand }: { size?: number; color?: string }) {
  return <Text style={[styles.wordmark, { fontSize: size, color }]}>CERO</Text>;
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {action}
    </View>
  );
}

// ------------------------------------------------------------------ Surfaces

export function Card({
  children,
  style,
  onPress,
  delay = 0,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  delay?: number;
  accessibilityLabel?: string;
}) {
  return (
    <FadeIn delay={delay}>
      {onPress ? (
        <PressableScale onPress={onPress} style={[styles.card, style]} accessibilityLabel={accessibilityLabel}>
          {children}
        </PressableScale>
      ) : (
        <View style={[styles.card, style]}>{children}</View>
      )}
    </FadeIn>
  );
}

/** A warm gradient card for the one thing that matters most on a screen. */
export function Hero({ children, delay = 0, tone = 'brand' }: { children: ReactNode; delay?: number; tone?: 'brand' | 'honey' | 'sage' }) {
  const gradient: [string, string] = {
    brand: ['#D98A63', '#B95F3A'] as [string, string],
    honey: ['#EDBC6A', '#D9913A'] as [string, string],
    sage: ['#8AA67B', '#5F7D52'] as [string, string],
  }[tone];
  return (
    <FadeIn delay={delay}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadow]}>
        {children}
      </LinearGradient>
    </FadeIn>
  );
}

export function HeroText({ children, size = 16, bold, style }: { children: ReactNode; size?: number; bold?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: serif, color: colors.white, fontSize: size, fontWeight: bold ? '700' : '400' }, style]}>{children}</Text>;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 6 }} />;
}

// ------------------------------------------------------------------ Buttons

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
}) {
  const v = buttonStyles[variant];
  const isDisabled = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[styles.button, v.container, variant === 'primary' && !isDisabled ? shadow : null, isDisabled && { opacity: 0.5 }]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={20} color={v.text.color as string} /> : null}
          <Text style={[styles.buttonText, v.text]}>{title}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const buttonStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: { container: { backgroundColor: colors.brand }, text: { color: colors.white } },
  secondary: { container: { backgroundColor: colors.brandSoft }, text: { color: colors.brandDark } },
  ghost: { container: { backgroundColor: 'transparent' }, text: { color: colors.brand } },
  danger: { container: { backgroundColor: colors.dangerSoft }, text: { color: colors.danger } },
};

/** A square shortcut with an icon, for the main actions on a screen. */
export function ActionTile({ icon, label, onPress, tone = 'brand' }: { icon: IconName; label: string; onPress: () => void; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={{ flex: 1 }}>
      <PressableScale onPress={onPress} style={[styles.tile, shadow]} accessibilityLabel={label}>
        <View style={[styles.iconCircle, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={22} color={t.fg} />
        </View>
        <Text style={styles.tileText}>{label}</Text>
      </PressableScale>
    </View>
  );
}

// ------------------------------------------------------------------ Inputs

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize = 'sentences',
  hint,
  error,
  multiline,
  icon,
  prefix,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  hint?: string;
  error?: string | null;
  multiline?: boolean;
  icon?: IconName;
  prefix?: string;
  maxLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputFocused,
          error ? { borderColor: colors.danger } : null,
          multiline ? { alignItems: 'flex-start' } : null,
        ]}
      >
        {icon ? <Ionicons name={icon} size={19} color={focused ? colors.brand : colors.muted} style={{ marginTop: multiline ? 14 : 0 }} /> : null}
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B9A89C"
          keyboardType={keyboardType}
          secureTextEntry={hidden}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          maxLength={maxLength}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline ? { minHeight: 84, textAlignVertical: 'top' } : null, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null]}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'} hitSlop={10}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Types the slashes for you: 15122026 → 15/12/2026. */
export function DateField(props: { label: string; value: string; onChangeText: (t: string) => void; hint?: string; error?: string | null }) {
  return (
    <Field
      {...props}
      icon="calendar-outline"
      placeholder="DD/MM/AAAA"
      keyboardType="number-pad"
      maxLength={10}
      onChangeText={(t) => {
        const digits = t.replace(/\D/g, '').slice(0, 8);
        const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
        props.onChangeText(parts.join('/'));
      }}
    />
  );
}

export function MoneyField(props: { label: string; value: string; onChangeText: (t: string) => void; hint?: string; error?: string | null; placeholder?: string }) {
  return <Field {...props} prefix="Q" keyboardType="decimal-pad" />;
}

export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <PressableScale
              key={o.value}
              onPress={() => {
                haptic.select();
                onChange(o.value);
              }}
              haptics={false}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <View style={styles.buttonInner}>
                {o.icon ? <Ionicons name={o.icon} size={17} color={selected ? colors.white : colors.brand} /> : null}
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

/** One-tap number picker, e.g. days per week. */
export function NumberPicker({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segment}>
        {nums.map((n) => {
          const selected = n === value;
          return (
            <Pressable
              key={n}
              onPress={() => {
                haptic.select();
                onChange(n);
              }}
              accessibilityRole="radio"
              accessibilityLabel={String(n)}
              accessibilityState={{ selected }}
              style={[styles.segmentItem, selected && styles.segmentSelected]}
            >
              <Text style={[styles.segmentText, selected && { color: colors.white, fontWeight: '700' }]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Toggle({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  const [anim] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [anim, value]);
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={styles.toggleRow}
    >
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Text style={styles.body}>{label}</Text>
        {detail ? <Text style={styles.muted}>{detail}</Text> : null}
      </View>
      <Animated.View
        style={[styles.toggleTrack, { backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: [colors.line, colors.sage] }) }]}
      >
        <Animated.View style={[styles.toggleKnob, { transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] }) }] }]} />
      </Animated.View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ Feedback

type Tone = 'brand' | 'honey' | 'sage' | 'warn' | 'danger';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  brand: { bg: colors.brandSoft, fg: colors.brandDark },
  honey: { bg: colors.honeySoft, fg: colors.warn },
  sage: { bg: colors.sageSoft, fg: colors.sage },
  warn: { bg: colors.warnSoft, fg: colors.warn },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

const BANNER_ICON: Record<'info' | 'warn' | 'danger' | 'ok', IconName> = {
  info: 'information-circle-outline',
  warn: 'alert-circle-outline',
  danger: 'close-circle-outline',
  ok: 'checkmark-circle-outline',
};

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; children: ReactNode }) {
  const t = { info: TONES.brand, warn: TONES.warn, danger: TONES.danger, ok: TONES.sage }[tone];
  return (
    <FadeIn>
      <View style={[styles.banner, { backgroundColor: t.bg }]}>
        <Ionicons name={BANNER_ICON[tone]} size={22} color={t.fg} />
        <Text style={[styles.bannerText, { color: t.fg }]}>{children}</Text>
      </View>
    </FadeIn>
  );
}

export function Badge({ text, tone = 'brand', icon }: { text: string; tone?: Tone; icon?: IconName }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={t.fg} /> : null}
      <Text style={[styles.badgeText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

export function IconCircle({ icon, tone = 'brand', size = 44 }: { icon: IconName; tone?: Tone; size?: number }) {
  const t = TONES[tone];
  return (
    <View style={[styles.iconCircle, { backgroundColor: t.bg, width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name={icon} size={size * 0.5} color={t.fg} />
    </View>
  );
}

const AVATAR_TONES: [string, string][] = [
  [colors.brandSoft, colors.brandDark],
  [colors.honeySoft, colors.warn],
  [colors.sageSoft, colors.sage],
  ['#F3E3EA', '#9A4F6B'],
];

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  const [bg, fg] = AVATAR_TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: serif, fontSize: size * 0.4, fontWeight: '700', color: fg }}>{initials || '·'}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.white, track = 'rgba(255,255,255,0.3)' }: { value: number; color?: string; track?: string }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.max(0, Math.min(1, value)), duration: 700, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anim, value]);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export function Row({ label, value, strong, icon }: { label: string; value: string; strong?: boolean; icon?: IconName }) {
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        {icon ? <Ionicons name={icon} size={17} color={colors.muted} /> : null}
        <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      </View>
      <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, text, children }: { icon: IconName; title: string; text: string; children?: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
      <IconCircle icon={icon} tone="honey" size={64} />
      <Subtitle style={{ textAlign: 'center' }}>{title}</Subtitle>
      <Muted style={{ textAlign: 'center', maxWidth: 320 }}>{text}</Muted>
      {children ? <View style={{ alignSelf: 'stretch', marginTop: 6 }}>{children}</View> : null}
    </Card>
  );
}

/** Dots that show how far along a multi-step form is. */
export function Steps({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= step ? colors.brand : colors.line }} />
        ))}
      </View>
      <Text style={styles.muted}>
        Paso {step + 1} de {total} · {labels[step]}
      </Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <Wordmark size={34} />
      <ActivityIndicator color={colors.brand} style={{ marginTop: 14 }} />
    </View>
  );
}

export function Gap({ size = 12 }: { size?: number }) {
  return <View style={{ height: size }} />;
}

export { Ionicons };

// ------------------------------------------------------------------ Styles

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  contentDesktop: { maxWidth: 1160, paddingHorizontal: 40, paddingTop: 28, gap: 18 },
  contentDesktopNarrow: { maxWidth: 760, paddingHorizontal: 40, paddingTop: 28, gap: 18 },
  columns: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  column: { gap: 16, minWidth: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  wordmark: { fontFamily: serif, fontWeight: '700', letterSpacing: 8, color: colors.brand },
  title: { fontFamily: serif, fontSize: 30, fontWeight: '700', color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontFamily: serif, fontSize: 20, fontWeight: '700', color: colors.ink },
  body: { fontFamily: serif, fontSize: 17, lineHeight: 24, color: colors.ink },
  muted: { fontFamily: serif, fontSize: 15, lineHeight: 21, color: colors.muted },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  sectionLabel: { fontFamily: serif, fontSize: 19, fontWeight: '700', color: colors.ink },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  hero: { borderRadius: 26, padding: 22, gap: 8 },
  button: { minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { fontFamily: serif, fontSize: 18, fontWeight: '700' },
  tile: {
    minHeight: 124,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tileText: { fontFamily: serif, fontSize: 15, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 7 },
  label: { fontFamily: serif, fontSize: 16, fontWeight: '700', color: colors.ink },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  inputFocused: { borderColor: colors.brand, backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontFamily: serif, fontSize: 18, color: colors.ink, paddingVertical: 12 },
  prefix: { fontFamily: serif, fontSize: 18, fontWeight: '700', color: colors.brand },
  hint: { fontFamily: serif, fontSize: 14, color: colors.muted },
  error: { fontFamily: serif, fontSize: 14, color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontFamily: serif, fontSize: 16, color: colors.ink },
  chipTextSelected: { color: colors.white, fontWeight: '700' },
  segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, padding: 4, gap: 4 },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: colors.brand },
  segmentText: { fontFamily: serif, fontSize: 18, color: colors.ink },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 4 },
  toggleTrack: { width: 50, height: 30, borderRadius: 15, justifyContent: 'center' },
  toggleKnob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white, ...shadow },
  banner: { borderRadius: 18, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bannerText: { fontFamily: serif, fontSize: 16, lineHeight: 22, flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: serif, fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 5 },
  rowLabel: { fontFamily: serif, fontSize: 16, color: colors.muted, flexShrink: 1 },
  rowValue: { fontFamily: serif, fontSize: 16, color: colors.ink, fontWeight: '700', textAlign: 'right' },
  strong: { color: colors.ink, fontWeight: '700', fontSize: 19 },
});

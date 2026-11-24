import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';

import { colors, serif, shadow } from './ui';

type Tone = 'ok' | 'info' | 'warn';

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/** A short message that slides in at the bottom to confirm an action. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const [anim] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, tone: Tone = 'ok') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone });
      if (tone === 'ok') haptic.success();
      else if (tone === 'warn') haptic.warn();
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(1.4)), useNativeDriver: Platform.OS !== 'web' }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(() => setToast(null));
      }, 2600);
    },
    [anim],
  );

  const icon = toast?.tone === 'warn' ? 'alert-circle' : toast?.tone === 'info' ? 'information-circle' : 'checkmark-circle';
  const tint = toast?.tone === 'warn' ? colors.honey : toast?.tone === 'info' ? colors.brandSoft : '#B9D3A8';

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.wrap,
            { bottom: insets.bottom + 20 },
            { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] },
          ]}
        >
          <View style={[styles.toast, shadow]}>
            <Ionicons name={icon} size={22} color={tint} />
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    maxWidth: 520,
  },
  text: { fontFamily: serif, color: colors.white, fontSize: 16, fontWeight: '700', flexShrink: 1 },
});

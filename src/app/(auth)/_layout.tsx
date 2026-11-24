import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/components/navigation';
import { useLayout } from '@/lib/useLayout';

export default function AuthLayout() {
  const { isDesktop } = useLayout();
  // On a computer the split layout has its own "Volver" link, so the header is hidden.
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ title: 'Crear cuenta', headerShown: !isDesktop }} />
      <Stack.Screen name="sign-in" options={{ title: 'Iniciar sesión', headerShown: !isDesktop }} />
    </Stack>
  );
}

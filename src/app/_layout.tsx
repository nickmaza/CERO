import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { stackScreenOptions } from '@/components/navigation';
import { ToastProvider } from '@/components/Toast';
import { Banner, Button, EmptyState, Loading, Screen } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';

function RootStack() {
  const { session, profile, loading, refreshProfile, signOut } = useAuth();

  // Guards are evaluated on the client, so wait until the session and profile are known.
  if (loading) return <Loading />;
  if (session && !profile) {
    return (
      <Screen>
        <EmptyState icon="cloud-offline-outline" title="No pudimos cargar tu cuenta" text="Revisa tu conexión a internet e intenta de nuevo.">
          <Button title="Reintentar" icon="refresh" onPress={refreshProfile} />
          <Button title="Cerrar sesión" variant="ghost" onPress={signOut} />
        </EmptyState>
        <Banner tone="info">Tus datos están guardados; solo falta conexión.</Banner>
      </Screen>
    );
  }

  const isEmployer = !!session && profile?.role === 'employer';
  const isWorker = !!session && profile?.role === 'worker';

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isEmployer}>
        <Stack.Screen name="(employer)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isWorker}>
        <Stack.Screen name="(worker)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <RootStack />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/components/navigation';
import { DesktopShell, type NavItem } from '@/components/Sidebar';
import { SignOutButton } from '@/components/SignOutButton';
import { useLayout } from '@/lib/useLayout';

const NAV: NavItem[] = [
  { label: 'Inicio', icon: 'home-outline', href: '/inicio', match: (p) => p === '/inicio' || (p.startsWith('/trabajadora/') && p !== '/trabajadora/nueva') },
  { label: 'Agregar trabajadora', icon: 'person-add-outline', href: '/trabajadora/nueva', match: (p) => p === '/trabajadora/nueva' },
];

export default function EmployerLayout() {
  const { isDesktop } = useLayout();
  // On a computer the side menu has "Cerrar sesión", so the header doesn't repeat it.
  const signOut = isDesktop ? undefined : () => <SignOutButton />;
  return (
    <DesktopShell items={NAV}>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="inicio" options={{ title: '', headerShown: !isDesktop, headerRight: signOut }} />
        <Stack.Screen name="trabajadora/nueva" options={{ title: 'Agregar trabajadora', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="trabajadora/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="trabajadora/[id]/editar" options={{ title: 'Editar datos' }} />
        <Stack.Screen name="trabajadora/[id]/pago" options={{ title: 'Registrar pago', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="trabajadora/[id]/finiquito" options={{ title: 'Finiquito' }} />
      </Stack>
    </DesktopShell>
  );
}

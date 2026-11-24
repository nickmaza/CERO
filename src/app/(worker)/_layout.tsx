import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/components/navigation';
import { DesktopShell, type NavItem } from '@/components/Sidebar';
import { SignOutButton } from '@/components/SignOutButton';
import { useLayout } from '@/lib/useLayout';

const NAV: NavItem[] = [{ label: 'Mis pagos', icon: 'wallet-outline', href: '/mis-pagos', match: (p) => p === '/mis-pagos' }];

export default function WorkerLayout() {
  const { isDesktop } = useLayout();
  return (
    <DesktopShell items={NAV}>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen
          name="mis-pagos"
          options={{ title: '', headerShown: !isDesktop, headerRight: isDesktop ? undefined : () => <SignOutButton /> }}
        />
      </Stack>
    </DesktopShell>
  );
}

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useLayout } from '@/lib/useLayout';

import { Avatar, Wordmark, colors, serif, type IconName } from './ui';

export interface NavItem {
  label: string;
  icon: IconName;
  href: Href;
  /** Highlights the item for this path and anything under it. */
  match: (path: string) => boolean;
}

/** The side menu used on a computer. */
function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const name = profile?.full_name || 'Mi cuenta';
  return (
    <View style={styles.sidebar}>
      <View style={{ paddingHorizontal: 12, paddingBottom: 24 }}>
        <Wordmark size={34} />
        <Text style={styles.tagline}>La planilla de tu hogar, en orden.</Text>
      </View>

      <View style={{ gap: 4 }}>
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <NavButton
              key={item.label}
              label={item.label}
              icon={item.icon}
              active={active}
              role="link"
              onPress={() => router.navigate(item.href)}
            />
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.account}>
        <Avatar name={name} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.accountName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.accountRole}>{profile?.role === 'worker' ? 'Trabajadora' : 'Empleador(a)'}</Text>
        </View>
      </View>
      <NavButton label="Cerrar sesión" icon="log-out-outline" onPress={signOut} />
    </View>
  );
}

function NavButton({
  label,
  icon,
  active = false,
  role = 'button',
  onPress,
}: {
  label: string;
  icon: IconName;
  active?: boolean;
  role?: 'link' | 'button';
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.item, active ? styles.itemActive : hovered ? styles.itemHover : null]}
    >
      <Ionicons name={icon} size={20} color={active ? colors.brandDark : colors.muted} />
      <Text style={[styles.itemText, active && { color: colors.brandDark, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

/** On a computer, puts the side menu next to the screens; on a phone, shows the screens alone. */
export function DesktopShell({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const { isDesktop } = useLayout();
  if (!isDesktop) return <>{children}</>;
  return (
    <View style={styles.shell}>
      <Sidebar items={items} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  sidebar: {
    width: 264,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 20,
  },
  tagline: { fontFamily: serif, fontSize: 14, color: colors.muted, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14 },
  itemActive: { backgroundColor: colors.brandSoft },
  itemHover: { backgroundColor: colors.bg },
  itemText: { fontFamily: serif, fontSize: 17, color: colors.ink },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.bg,
    marginBottom: 6,
  },
  accountName: { fontFamily: serif, fontSize: 16, fontWeight: '700', color: colors.ink },
  accountRole: { fontFamily: serif, fontSize: 13, color: colors.muted },
});

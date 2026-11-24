import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, Text } from 'react-native';

import { useAuth } from '@/lib/auth';

import { colors, serif } from './ui';

export function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable
      onPress={signOut}
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      hitSlop={10}
      // The web header has no right inset, so keep the label off the screen edge.
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, Platform.OS === 'web' ? { marginRight: 16 } : null]}
    >
      <Ionicons name="log-out-outline" size={18} color={colors.brand} />
      <Text style={{ fontFamily: serif, color: colors.brand, fontSize: 16, fontWeight: '700' }}>Salir</Text>
    </Pressable>
  );
}

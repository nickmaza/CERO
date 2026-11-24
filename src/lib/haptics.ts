import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small vibrations that confirm a touch. Browsers don't support them, so they're skipped on web.
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  tap: () => {
    if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  select: () => {
    if (enabled) void Haptics.selectionAsync();
  },
  success: () => {
    if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warn: () => {
    if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};

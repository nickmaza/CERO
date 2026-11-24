import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

import { colors, serif } from './ui';

/** Shared header look for every stack: cream background, serif title, terracotta back arrow. */
export const stackScreenOptions: ComponentProps<typeof Stack>['screenOptions'] = {
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.brand,
  headerTitleStyle: { fontFamily: serif, fontWeight: '700', fontSize: 19, color: colors.ink },
  headerBackTitle: 'Atrás',
  headerBackTitleStyle: { fontFamily: serif },
  contentStyle: { backgroundColor: colors.bg },
  animation: 'slide_from_right',
};

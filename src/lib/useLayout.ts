import { Platform, useWindowDimensions } from 'react-native';

/** Browser windows at least this wide get the computer layout. */
export const DESKTOP_MIN_WIDTH = 900;

/**
 * Picks the layout. Phones (and narrow browser windows) keep the phone layout;
 * a computer's browser gets side-by-side columns and a side menu. The features are
 * the same in both; only the arrangement changes.
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
  return { isDesktop, width };
}

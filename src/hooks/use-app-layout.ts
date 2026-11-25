import { useSyncExternalStore } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const maxAppWidth = 1240;
const subscribe = () => () => {};

export function useAppLayout() {
  const { width, height } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  // A exportação estática da Web começa sem dimensões. Aplique as medidas após a hidratação.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (Platform.OS === 'web' && !hydrated) return { wide: false, short: false, split: false };

  const availableWidth = width - left - right;
  return { wide: availableWidth >= 720, short: height < 500, split: availableWidth >= 720 && width > height };
}

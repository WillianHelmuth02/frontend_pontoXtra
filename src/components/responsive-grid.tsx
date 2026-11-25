import { Children, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppLayout } from '@/hooks/use-app-layout';

export function ResponsiveGrid({ children }: PropsWithChildren) {
  const { wide } = useAppLayout();

  return <View style={wide ? styles.grid : styles.stack}>
    {Children.map(children, (child) => child == null ? null : <View style={wide && styles.column}>{child}</View>)}
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, marginHorizontal: -7 },
  column: { width: '50%', minWidth: 0, paddingHorizontal: 7 },
});

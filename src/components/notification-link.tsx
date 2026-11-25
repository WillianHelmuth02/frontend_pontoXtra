import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/app-text';
import { useNotificacoes } from '@/contexts/notificacoes';

export function NotificationLink() {
  const { lista } = useNotificacoes();
  const unread = lista.nao_lidas;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Notificações, ${unread} ${unread === 1 ? 'não lida' : 'não lidas'}`}
      onPress={() => router.push('/notificacoes')} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <View aria-hidden style={styles.content}>
        <SymbolView name={{ ios: 'bell', android: 'notifications', web: 'notifications' }} size={22} tintColor="#FFFFFF" />
        {unread > 0 && <Text style={styles.badge}>{unread > 99 ? '99+' : unread}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#004999', borderWidth: 1, borderColor: '#B8D6FF' },
  pressed: { opacity: 0.65 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: { minWidth: 20, borderRadius: 12, paddingHorizontal: 4, color: '#004999', backgroundColor: '#E5EDFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
});

import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Text } from '@/components/app-text';
import { useNotificacoes } from '@/contexts/notificacoes';
export function NotificationLink() {
  const { lista } = useNotificacoes();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Notificações, ${lista.nao_lidas} não lidas`} onPress={() => router.push('/notificacoes')} style={{ padding: 10 }}>
    <Text style={{ color: 'white', fontWeight: '600' }}>Notificações{lista.nao_lidas ? ` (${lista.nao_lidas})` : ''}</Text>
  </Pressable>;
}

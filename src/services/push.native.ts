import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from '@/services/api';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
let token: string | null = null;
let geracao = 0;
let cadastro: Promise<void> | null = null;

export async function ativarPush(solicitar = true): Promise<string> {
  if (Constants.executionEnvironment === 'storeClient') return 'Instale a versão Android do PontoXtra para ativar os avisos com o aplicativo fechado.';
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return 'Os avisos do celular ainda não estão disponíveis nesta versão.';
  const atual = geracao;
  await cadastro?.catch(() => {});
  if (atual !== geracao) return '';
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('aprovacoes', { name: 'Aprovações de jornadas', importance: Notifications.AndroidImportance.HIGH, sound: 'default' });
  let permissao = await Notifications.getPermissionsAsync();
  if (permissao.status !== 'granted' && solicitar) permissao = await Notifications.requestPermissionsAsync();
  if (permissao.status !== 'granted') return solicitar ? 'Permita as notificações nas configurações do celular para receber os avisos.' : '';
  const novoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (atual !== geracao) return '';
  token = novoToken;
  cadastro = api<void>('/notificacoes/dispositivo', { method: 'POST', body: JSON.stringify({ token, plataforma: Platform.OS }) });
  await cadastro;
  return 'Avisos ativados neste celular.';
}

export async function removerPush() {
  geracao++;
  await cadastro?.catch(() => {});
  // O cache some quando o processo fecha; ainda precisamos desassociar esse celular.
  if (!token && Constants.executionEnvironment !== 'storeClient') {
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (projectId && (await Notifications.getPermissionsAsync()).status === 'granted') {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    }
  }
  if (token) {
    await api<void>('/notificacoes/dispositivo', { method: 'DELETE', body: JSON.stringify({ token, plataforma: Platform.OS }) });
    token = null;
  }
  await Notifications.dismissAllNotificationsAsync();
  Notifications.clearLastNotificationResponse();
}

export function cancelarRegistroPush() { geracao++; }

export function observarPush(recebida: () => void, abrir: (data: Record<string, unknown>) => void) {
  const receber = Notifications.addNotificationReceivedListener(recebida);
  const resposta = Notifications.addNotificationResponseReceivedListener((r) => {
    Notifications.clearLastNotificationResponse();
    abrir(r.notification.request.content.data ?? {});
  });
  const ultima = Notifications.getLastNotificationResponse();
  if (ultima) {
    Notifications.clearLastNotificationResponse();
    abrir(ultima.notification.request.content.data ?? {});
  }
  return () => { receber.remove(); resposta.remove(); };
}

import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth';
import { NotificationLink } from '@/components/notification-link';

export const BLUE = '#005BCC';
export const PERFIS = { OPERACIONAL: 'Operacional', RH: 'RH', ADMINISTRADOR: 'Administrador' };

/** Moldura das novas telas, seguindo o protótipo: marca, saudação e navegação
 * por perfil. A lógica de negócio fica nos serviços e no backend, fora daqui.
 */
export function JourneyShell({ title, children, busy = false }: PropsWithChildren<{ title: string; busy?: boolean }>) {
  const { usuario } = useAuth();
  if (!usuario) return <Redirect href="/login" />;
  return <View style={ui.screen}>
    <StatusBar style="light" />
    <SafeAreaView edges={['top']} style={ui.blue}><View style={ui.header}><Text style={ui.brand}>PontoXtra</Text><NotificationLink /></View></SafeAreaView>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
      <View style={ui.greeting}><Text style={ui.greetingText}>Olá, {usuario.nome}</Text><Text style={ui.greetingText}>Perfil: {PERFIS[usuario.perfil]}</Text></View>
      <Text accessibilityRole="header" style={ui.title}>{title}</Text>
      {children}
    </ScrollView>
    <SafeAreaView edges={['bottom']} style={ui.blue}><View style={ui.footer}>
      <Button label="INÍCIO" disabled={busy} onPress={() => router.replace('/session')} footer />
      <Button label="JORNADAS" disabled={busy} onPress={() => router.replace('/jornadas')} footer />
      <Button label="RELATÓRIOS" disabled={busy} onPress={() => router.push('/relatorios')} footer />
      <Button label="SAIR" disabled={busy} onPress={() => router.push('/logout')} footer />
    </View></SafeAreaView>
  </View>;
}

export function Button({ label, onPress, disabled, secondary, danger, footer }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean; footer?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [footer ? ui.footerButton : ui.button, secondary && ui.secondary, danger && ui.danger, (disabled || pressed) && ui.dim]}>
    <Text style={[ui.buttonText, secondary && ui.secondaryText]}>{label}</Text>
  </Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, multiline = false, disabled = false, secureTextEntry = false }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; disabled?: boolean; secureTextEntry?: boolean;
}) {
  return <View style={ui.field}><Text style={ui.label}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#64748B" autoCapitalize="none" editable={!disabled} multiline={multiline} secureTextEntry={secureTextEntry} style={[ui.input, multiline && { minHeight: 90 }]} />
  </View>;
}

export function ResourceState({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  return <>{loading && <ActivityIndicator color={BLUE} style={{ margin: 20 }} />}
    {!!error && <View style={ui.card}><Text accessibilityRole="alert" style={ui.error}>{error}</Text><Button label="Tentar novamente" onPress={onRetry} secondary /></View>}
  </>;
}

/** Seletor pesquisável comum à Web e ao mobile, sem dependência de um select HTML.
 * O catálogo recebido já vem filtrado como ativo pela API na criação da jornada.
 */
export function CadastroPicker({ label, items, value, onChange, disabled }: {
  label: string; items: { id: string; nome: string }[]; value: string;
  onChange: (id: string) => void; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  return <View style={ui.field}><Text style={ui.label}>{label}</Text>
    <Button secondary label={items.find((item) => item.id === value)?.nome ?? 'Selecionar'} disabled={disabled} onPress={() => { setSearch(''); setOpen(true); }} />
    <Modal transparent visible={open} onRequestClose={() => setOpen(false)} animationType="fade">
      <View style={{ flex: 1, backgroundColor: '#001B4266', padding: 24, alignItems: 'center', justifyContent: 'center' }}>
        <View accessibilityViewIsModal style={{ backgroundColor: '#FFFFFF', width: '100%', maxWidth: 540, height: '80%', padding: 20, borderRadius: 16, gap: 14 }}>
          <Text accessibilityRole="header" style={ui.subtitle}>{label}</Text>
          <Field label="Buscar por nome" value={search} onChangeText={setSearch} />
          <FlatList data={items.filter((item) => item.nome.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))} keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled" ListEmptyComponent={<Text style={ui.text}>Nenhum cadastro encontrado.</Text>}
            renderItem={({ item }) => <View style={{ marginBottom: 8 }}><Button label={`${item.nome} · #${item.id}`} secondary={value !== item.id} onPress={() => { onChange(item.id); setOpen(false); }} /></View>} />
          <Button secondary label="Fechar" onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>
  </View>;
}

/** Componentes nativos e estilos compartilhados evitam diferenças de formulário
 * entre as páginas de criação, correção, detalhes e os painéis por perfil.
 */
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5FF' }, blue: { backgroundColor: BLUE },
  header: { minHeight: 90, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 42, color: '#20C12D', fontWeight: '800' },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 24, gap: 14, flexGrow: 1 },
  greeting: { alignSelf: 'center', backgroundColor: BLUE, borderRadius: 40, paddingVertical: 8, paddingHorizontal: 24 },
  greetingText: { textAlign: 'center', color: '#54EF60', fontSize: 18 },
  title: { fontSize: 28, color: BLUE, fontWeight: '700', marginVertical: 8 },
  subtitle: { fontSize: 20, color: BLUE, fontWeight: '700' },
  text: { color: '#294B75', fontSize: 15, lineHeight: 23 },
  card: { borderWidth: 1.5, borderColor: BLUE, borderRadius: 8, padding: 16, gap: 10 },
  button: { paddingVertical: 14, paddingHorizontal: 16, backgroundColor: BLUE, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: BLUE }, secondaryText: { color: BLUE },
  danger: { backgroundColor: '#BA2525' }, dim: { opacity: 0.45 },
  field: { gap: 7 }, label: { color: BLUE, fontSize: 16, fontWeight: '600' },
  input: { padding: 14, borderColor: BLUE, borderWidth: 1, borderRadius: 8, color: '#173F6B', fontSize: 16 },
  error: { color: '#B42318', lineHeight: 23 }, notice: { color: '#17643F', lineHeight: 23 },
  footer: { flexDirection: 'row', maxWidth: 680, width: '100%', alignSelf: 'center' },
  footerButton: { flex: 1, paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
});

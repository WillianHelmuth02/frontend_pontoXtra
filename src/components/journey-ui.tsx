import { AppModal } from '@/components/app-modal';
import { Redirect, router, useCanGoBack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text, TextInput } from '@/components/app-text';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth';
import { NotificationLink } from '@/components/notification-link';
import { FontSizeControl } from '@/components/font-size-control';
import { useFontSize } from '@/contexts/font-size';
import { maxAppWidth, useAppLayout } from '@/hooks/use-app-layout';

export const BLUE = '#005BCC';
export const PERFIS = { OPERACIONAL: 'Operacional', RH: 'RH', ADMINISTRADOR: 'Administrador' };

const JOURNEY_ICONS = {
  trash: { ios: 'trash', android: 'delete_outline', web: 'delete_outline' },
  reports: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  clear: { ios: 'xmark', android: 'close', web: 'close' },
  sort: { ios: 'arrow.up.arrow.down', android: 'sort', web: 'sort' },
  filters: { ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' },
} as const;

export function JourneyIcon({ icon, size = 20 }: { icon: keyof typeof JOURNEY_ICONS; size?: number }) {
  return <View aria-hidden><SymbolView name={JOURNEY_ICONS[icon]} size={size} tintColor={BLUE} /></View>;
}

export function AppHeader({ nome, perfil, busy = false }: {
  nome: string; perfil: keyof typeof PERFIS; busy?: boolean;
}) {
  const pathname = usePathname();
  const canGoBack = useCanGoBack();
  const { wide, short } = useAppLayout();
  const home = perfil === 'OPERACIONAL' ? '/jornadas' : '/session';

  function voltar() {
    if (router.canGoBack()) router.back();
    else if (pathname !== home) router.replace(home);
  }

  const backButton = (canGoBack || pathname !== home) && (
    <Pressable accessibilityRole="button" accessibilityLabel="Voltar" disabled={busy}
      onPress={voltar} style={({ pressed }) => [ui.headerBack, (pressed || busy) && ui.dim]}>
      <View aria-hidden><SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor="#FFFFFF" /></View>
    </Pressable>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={ui.blue}>
      <View style={[ui.header, wide && ui.headerWide, short && ui.headerShort]}>
        <View style={[ui.headerRow, wide && ui.headerMainWide]}>
          {wide && backButton}
          <Text style={ui.brand}>PontoXtra</Text>
          <View style={ui.headerRow}>
            <FontSizeControl onBlue />
            <NotificationLink />
          </View>
        </View>
        <View style={[ui.headerRow, wide && ui.headerAccountWide]}>
          {!wide && backButton}
          <Pressable accessibilityRole="button" accessibilityLabel={`Minha conta de ${nome}, ${PERFIS[perfil]}`}
            onPress={() => router.navigate('/minha-conta')} style={({ pressed }) => [ui.userInfo, pressed && ui.dim]}>
            <View aria-hidden>
              <SymbolView name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }} size={24} tintColor="#FFFFFF" />
            </View>
            <View style={ui.userDetails}>
              <Text numberOfLines={1} style={ui.userName}>{nome}</Text>
              <Text style={ui.userProfile}>{PERFIS[perfil]}</Text>
            </View>
            <View aria-hidden>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor="#E5EDFF" />
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function JourneyShell({ title, titleIcon, wide, children, busy = false }: PropsWithChildren<{
  title: string; wide?: boolean; titleIcon?: keyof typeof JOURNEY_ICONS; busy?: boolean;
}>) {
  const { usuario } = useAuth();
  const { size } = useFontSize();
  const { width } = useWindowDimensions();
  const layout = useAppLayout();
  const wrapFooter = size === 'Grande' && width < 440;
  if (!usuario) return <Redirect href="/login" />;
  return <View style={ui.screen}>
    <StatusBar style="light" />
    <AppHeader nome={usuario.nome} perfil={usuario.perfil} busy={busy} />
    <SafeAreaView edges={['left', 'right']} style={ui.fill}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[ui.content, wide && ui.reportContent, (layout.wide || wide) && ui.expanded, layout.short && ui.shortContent]}>
        {titleIcon ? (
          <View style={ui.titleRow}>
            <View style={ui.titleIcon}><JourneyIcon icon={titleIcon} size={24} /></View>
            <Text accessibilityRole="header" style={[ui.title, ui.titleWithIcon]}>{title}</Text>
          </View>
        ) : <Text accessibilityRole="header" style={ui.title}>{title}</Text>}
        {children}
      </ScrollView>
    </SafeAreaView>
    <SafeAreaView edges={['bottom', 'left', 'right']} style={ui.blue}><View style={[ui.footer, layout.wide && ui.expanded, wrapFooter && ui.footerWrapped]}>
      <Button label="INÍCIO" disabled={busy} onPress={() => router.replace('/session')} footer wrapped={wrapFooter} compact={layout.short} />
      <Button label="JORNADAS" disabled={busy} onPress={() => router.replace('/jornadas')} footer wrapped={wrapFooter} compact={layout.short} />
      <Button label="RELATÓRIOS" disabled={busy} onPress={() => router.push('/relatorios')} footer wrapped={wrapFooter} compact={layout.short} />
      <Button label="SAIR" disabled={busy} onPress={() => router.push('/logout')} footer wrapped={wrapFooter} compact={layout.short} />
    </View></SafeAreaView>
  </View>;
}

export function Button({ label, onPress, disabled, secondary, danger, footer, wrapped, compact }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean; footer?: boolean; wrapped?: boolean; compact?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [footer ? ui.footerButton : ui.button, compact && ui.compactButton, wrapped && ui.footerButtonWrapped, secondary && ui.secondary, danger && ui.danger, (disabled || pressed) && ui.dim]}>
    <Text style={[ui.buttonText, secondary && ui.secondaryText]}>{label}</Text>
  </Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, multiline = false, disabled = false, secureTextEntry = false, autoComplete, keyboardType }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; disabled?: boolean; secureTextEntry?: boolean;
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete']; keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
}) {
  return <View style={ui.field}><Text style={ui.label}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#64748B" autoCapitalize="none" autoComplete={autoComplete} keyboardType={keyboardType} editable={!disabled} multiline={multiline} secureTextEntry={secureTextEntry} style={[ui.input, multiline && { minHeight: 90 }]} />
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
    <AppModal transparent visible={open} onRequestClose={() => setOpen(false)} animationType="fade">
      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
        <View accessibilityViewIsModal style={{ backgroundColor: '#FFFFFF', width: '100%', maxWidth: 540, height: '80%', padding: 20, borderRadius: 16, gap: 14 }}>
          <Text accessibilityRole="header" style={ui.subtitle}>{label}</Text>
          <Field label="Buscar por nome" value={search} onChangeText={setSearch} />
          <FlatList data={items.filter((item) => item.nome.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))} keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled" ListEmptyComponent={<Text style={ui.text}>Nenhum cadastro encontrado.</Text>}
            renderItem={({ item }) => <View style={{ marginBottom: 8 }}><Button label={`${item.nome} · #${item.id}`} secondary={value !== item.id} onPress={() => { onChange(item.id); setOpen(false); }} /></View>} />
          <Button secondary label="Fechar" onPress={() => setOpen(false)} />
        </View>
      </View>
    </AppModal>
  </View>;
}

/** Componentes nativos e estilos compartilhados evitam diferenças de formulário
 * entre as páginas de criação, correção, detalhes e os painéis por perfil.
 */
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5FF' }, blue: { backgroundColor: BLUE },
  fill: { flex: 1 }, expanded: { maxWidth: maxAppWidth },
  headerShort: { paddingVertical: 4 },
  header: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  headerWide: { maxWidth: maxAppWidth, flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerMainWide: { flex: 1, minWidth: 0 },
  headerAccountWide: { width: '32%', maxWidth: 320 },
  brand: { flex: 1, minWidth: 0, fontSize: 26, color: '#54EF60', fontWeight: '800', letterSpacing: -0.6 },
  headerBack: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#004999' },
  userInfo: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#004999' },
  userDetails: { flex: 1, minWidth: 0 },
  userName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  userProfile: { color: '#E5EDFF', fontSize: 12 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 24, gap: 14, flexGrow: 1 },
  reportContent: { paddingHorizontal: 16 }, shortContent: { paddingVertical: 12 },
  title: { fontSize: 28, color: BLUE, fontWeight: '700', marginVertical: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#E5EDFF' },
  titleWithIcon: { flexShrink: 1 },
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
  footerWrapped: { flexWrap: 'wrap' },
  footerButtonWrapped: { flexBasis: '50%', minHeight: 44, paddingVertical: 8 },
  compactButton: { minHeight: 44, paddingVertical: 8 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
});

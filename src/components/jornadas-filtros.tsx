import { useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FILTROS_VAZIOS, ORDENS_JORNADAS, STATUS_LABELS, queryJornadas, type FiltrosJornadas, type OrdemJornadas, type StatusJornada } from '@/utils/jornadas';
import { BLUE, Button, ui } from './journey-ui';

const STATUS_GROUPS: { title: string; options: StatusJornada[] }[] = [
  { title: 'Realização', options: ['AGUARDANDO_AUTORIZACAO_REALIZACAO', 'AUTORIZADA_PARA_REALIZACAO', 'REALIZACAO_REJEITADA', 'EM_ANDAMENTO', 'CANCELADO'] },
  { title: 'Conferência e pagamento', options: ['AGUARDANDO_CONFERENCIA', 'AGUARDANDO_AUTORIZACAO', 'AUTORIZADO', 'REJEITADO', 'PAGO'] },
];

function FilterOption({ label, selected, onPress }: {
  label: string; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.selectedOption, pressed && ui.dim]}>
      <View style={[styles.radio, selected && styles.selectedRadio]}>{selected && <View style={styles.radioDot} />}</View>
      <Text style={styles.optionLabel}>{label}</Text>
    </Pressable>
  );
}

export function JornadasFiltros({ applied, onApply, onClose }: {
  applied: FiltrosJornadas;
  onApply: (filters: FiltrosJornadas) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(applied);
  const [error, setError] = useState('');

  function submit(next: FiltrosJornadas) {
    try {
      queryJornadas(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Filtros inválidos.');
      return;
    }
    Keyboard.dismiss();
    onApply(next);
  }

  function selectStatus(status: FiltrosJornadas['status']) {
    setDraft((current) => ({ ...current, status }));
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={ui.subtitle}>Filtrar jornadas</Text>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Status da jornada</Text>
              <FilterOption label="Todos os status" selected={!draft.status} onPress={() => selectStatus('')} />
              {STATUS_GROUPS.map(({ title, options }) => (
                <View key={title} style={styles.section}>
                  <Text accessibilityRole="header" style={styles.groupTitle}>{title}</Text>
                  <View style={styles.optionsGrid}>
                    {options.map((status) => (
                      <View key={status} style={styles.gridCell}>
                        <FilterOption label={STATUS_LABELS[status]} selected={draft.status === status} onPress={() => selectStatus(status)} />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Período da jornada</Text>
              <View style={styles.optionsGrid}>
                <View style={styles.dateCell}>
                  <Text style={styles.groupTitle}>De</Text>
                  <TextInput accessibilityLabel="Data inicial" placeholder="DD/MM/AAAA" placeholderTextColor="#52637C"
                    maxLength={10} value={draft.data_inicio} style={styles.input}
                    onChangeText={(data_inicio) => { setError(''); setDraft((current) => ({ ...current, data_inicio })); }} />
                </View>
                <View style={styles.dateCell}>
                  <Text style={styles.groupTitle}>Até</Text>
                  <TextInput accessibilityLabel="Data final" placeholder="DD/MM/AAAA" placeholderTextColor="#52637C"
                    maxLength={10} value={draft.data_fim} style={styles.input}
                    onChangeText={(data_fim) => { setError(''); setDraft((current) => ({ ...current, data_fim })); }} />
                </View>
              </View>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
            <View style={styles.actions}>
              <Button secondary label="Limpar" onPress={() => submit(FILTROS_VAZIOS)} />
              <Button secondary label="Cancelar" onPress={onClose} />
              <Button label="Aplicar" onPress={() => submit(draft)} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function JornadasOrdem({ value, onSelect, onClose }: {
  value: OrdemJornadas; onSelect: (order: OrdemJornadas) => void; onClose: () => void;
}) {
  const options = Object.keys(ORDENS_JORNADAS) as OrdemJornadas[];
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={[styles.dialog, styles.orderDialog]}>
          <View style={styles.header}><Text accessibilityRole="header" style={ui.subtitle}>Ordenar jornadas</Text></View>
          <ScrollView style={styles.orderScroll} contentContainerStyle={styles.orderOptions}>
            {options.map((order) => (
              <FilterOption key={order} label={ORDENS_JORNADAS[order]} selected={order === value} onPress={() => onSelect(order)} />
            ))}
          </ScrollView>
          <View style={styles.footer}><Button secondary label="Cancelar" onPress={onClose} /></View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  orderDialog: { maxWidth: 440, height: 'auto', maxHeight: '94%' },
  orderScroll: { flexGrow: 0, flexShrink: 1 },
  orderOptions: { padding: 16, gap: 8 },
  overlay: { flex: 1, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#001B4266' },
  dialog: { width: '100%', maxWidth: 760, height: '94%', backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden' },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#DCE6F3' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 20 },
  section: { gap: 8 },
  sectionTitle: { color: '#173F6B', fontWeight: '700', fontSize: 17 },
  groupTitle: { color: '#3D5D85', fontWeight: '600', fontSize: 14 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: { flexBasis: 288, flexGrow: 1, flexShrink: 1 },
  dateCell: { flexBasis: 132, flexGrow: 1, flexShrink: 1, gap: 6 },
  option: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#C2D3E9' },
  selectedOption: { backgroundColor: '#EDF4FF', borderColor: BLUE },
  optionLabel: { flex: 1, color: '#173F6B', fontSize: 15, fontWeight: '600' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#617D9F', alignItems: 'center', justifyContent: 'center' },
  selectedRadio: { borderColor: BLUE },
  radioDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: BLUE },
  input: { ...ui.input, minHeight: 48, borderColor: '#A3B9D8', backgroundColor: '#FFFFFF' },
  footer: { paddingHorizontal: 12, paddingVertical: 10, gap: 6, borderTopWidth: 1, borderColor: '#DCE6F3' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
});

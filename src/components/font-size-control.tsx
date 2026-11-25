import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/app-text';
import { useFontSize } from '@/contexts/font-size';

const options = ['Pequeno', 'Médio', 'Grande'] as const;

export function FontSizeControl({ onBlue = false }: { onBlue?: boolean }) {
  const [open, setOpen] = useState(false);
  const { size, selectSize } = useFontSize();
  const close = () => setOpen(false);

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Tamanho da fonte: ${size}`}
      aria-expanded={open} onPress={() => setOpen(true)}
      style={[styles.trigger, onBlue && styles.triggerOnBlue]}>
      <Text style={[styles.triggerLabel, onBlue && styles.white]}>Aa</Text>
    </Pressable>
    <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.panel}>
          <ScrollView bounces={false} contentContainerStyle={styles.panelContent}>
            <Text accessibilityRole="header" style={styles.title}>Tamanho da fonte</Text>
            <View accessibilityRole="radiogroup" style={styles.options}>
              {options.map((option) => (
                <Pressable key={option} accessibilityRole="radio" aria-checked={size === option}
                  style={[styles.option, size === option && styles.selected]}
                  onPress={() => { selectSize(option); close(); }}>
                  <Text style={[styles.optionLabel, size === option && styles.white]}>{option}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable accessibilityRole="button" style={styles.close} onPress={close}>
              <Text style={styles.optionLabel}>Fechar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingHorizontal: 8, backgroundColor: '#E5EDFF' },
  triggerOnBlue: { backgroundColor: '#004999', borderWidth: 1, borderColor: '#B8D6FF' },
  triggerLabel: { color: '#004999', fontSize: 18, fontWeight: '700' },
  white: { color: '#FFFFFF' },
  overlay: { flex: 1, backgroundColor: '#001B4266', padding: 24, alignItems: 'center', justifyContent: 'center' },
  panel: { width: '100%', maxWidth: 360, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 16 },
  panelContent: { padding: 20, gap: 14 },
  title: { color: '#173F6B', fontSize: 20, fontWeight: '700' },
  options: { gap: 8 },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#005BCC' },
  selected: { backgroundColor: '#005BCC' },
  optionLabel: { color: '#004999', fontSize: 16, fontWeight: '600' },
  close: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});

import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dataParaApi, formatarData } from '@/utils/jornadas';
import { BLUE, Button, ui } from './journey-ui';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MIN_MONTH = 1000 * 12;
const MAX_MONTH = 9999 * 12 + 11;
const ROW_HEIGHT = 44;

const twoDigits = (value: number) => String(value).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, index) => twoDigits(index));
const MINUTES = Array.from({ length: 60 }, (_, index) => twoDigits(index));

function Calendar({ value, onSelect }: { value: string; onSelect: (date: string) => void }) {
  const [year, month] = dataParaApi(value).split('-').map(Number);
  const [visibleMonth, setVisibleMonth] = useState(() => year * 12 + month - 1);
  const visibleYear = Math.floor(visibleMonth / 12);
  const monthIndex = visibleMonth % 12;
  // Use UTC for calendar arithmetic so a user's device zone cannot shift the selected date.
  const firstWeekday = new Date(Date.UTC(visibleYear, monthIndex, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(visibleYear, monthIndex + 1, 0)).getUTCDate();
  const weekCount = Math.ceil((firstWeekday + dayCount) / 7);
  const monthLabel = `${MONTHS[monthIndex]} de ${visibleYear}`;

  return (
    <ScrollView style={styles.calendarScroll} keyboardShouldPersistTaps="handled">
      <View style={styles.monthNavigation}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior"
          disabled={visibleMonth <= MIN_MONTH} accessibilityState={{ disabled: visibleMonth <= MIN_MONTH }}
          onPress={() => setVisibleMonth((current) => Math.max(MIN_MONTH, current - 1))}
          style={({ pressed }) => [styles.monthArrow, (pressed || visibleMonth <= MIN_MONTH) && ui.dim]}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês"
          disabled={visibleMonth >= MAX_MONTH} accessibilityState={{ disabled: visibleMonth >= MAX_MONTH }}
          onPress={() => setVisibleMonth((current) => Math.min(MAX_MONTH, current + 1))}
          style={({ pressed }) => [styles.monthArrow, (pressed || visibleMonth >= MAX_MONTH) && ui.dim]}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((weekday) => <Text key={weekday} style={styles.weekday}>{weekday}</Text>)}
      </View>
      {Array.from({ length: weekCount }, (_, week) => (
        <View key={week} style={styles.week}>
          {Array.from({ length: 7 }, (_, column) => {
            const day = week * 7 + column - firstWeekday + 1;
            if (day < 1 || day > dayCount) return <View key={column} style={styles.dayCell} />;
            const date = formatarData(`${visibleYear}-${twoDigits(monthIndex + 1)}-${twoDigits(day)}`);
            const selected = date === value;
            return (
              <Pressable key={column} accessibilityRole="button" accessibilityLabel={`${day} de ${monthLabel}`}
                accessibilityState={{ selected }} onPress={() => onSelect(date)}
                style={({ pressed }) => [styles.dayCell, selected && styles.selectedDay, pressed && ui.dim]}>
                <Text style={[styles.dayText, selected && styles.selectedDayText]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

function TimeColumn({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (value: string) => void;
}) {
  return (
    <View style={styles.timeColumn}>
      <Text style={styles.timeLabel}>{label}</Text>
      <FlatList
        data={options}
        keyExtractor={(option) => option}
        initialScrollIndex={Math.max(0, options.indexOf(value) - 1)}
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        style={styles.timeList}
        renderItem={({ item }) => {
          const selected = item === value;
          return (
            <Pressable accessibilityRole="radio" accessibilityLabel={`${label} ${item}`}
              accessibilityState={{ checked: selected }} onPress={() => onChange(item)}
              style={({ pressed }) => [styles.timeOption, selected && styles.selectedTime, pressed && ui.dim]}>
              <Text style={[styles.timeNumber, selected && styles.selectedTimeNumber]}>{item}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

export function SchedulePicker({ label, mode, value, onChange, disabled }: {
  label: string; mode: 'date' | 'time'; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');
  const isDate = mode === 'date';
  const close = () => setOpen(false);

  function openPicker() {
    if (!isDate) {
      const [selectedHour, selectedMinute] = (value || '00:00').split(':');
      setHour(selectedHour);
      setMinute(selectedMinute);
    }
    setOpen(true);
  }

  function select(nextValue: string) {
    onChange(nextValue);
    close();
  }

  return (
    <View style={ui.field}>
      <Text style={ui.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value || 'Selecionar horário'}`}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        onPress={openPicker}
        style={({ pressed }) => [styles.trigger, (pressed || disabled) && ui.dim]}>
        <Text style={value ? styles.triggerValue : ui.text}>{value || 'Selecionar horário'}</Text>
        <Text aria-hidden style={styles.triggerArrow}>›</Text>
      </Pressable>
      {open && (
        <Modal transparent animationType="fade" onRequestClose={close}>
          <View style={styles.overlay}>
            <View accessibilityViewIsModal style={styles.dialog}>
              <Text accessibilityRole="header" style={ui.subtitle}>{label.replace(/ \*$/, '')}</Text>
              {isDate ? <Calendar value={value} onSelect={select} /> : (
                <>
                  <Text accessibilityLiveRegion="polite" style={styles.timePreview}>{hour}:{minute}</Text>
                  <View style={styles.timeColumns}>
                    <TimeColumn label="Hora" options={HOURS} value={hour} onChange={setHour} />
                    <TimeColumn label="Minuto" options={MINUTES} value={minute} onChange={setMinute} />
                  </View>
                  <Button label="Confirmar horário" onPress={() => select(`${hour}:${minute}`)} />
                </>
              )}
              <Button label="Cancelar" secondary onPress={close} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: '#A3B9D8', borderRadius: 10, backgroundColor: '#FFFFFF' },
  triggerValue: { color: '#173F6B', fontSize: 16, fontWeight: '600' },
  triggerArrow: { color: BLUE, fontSize: 25 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: '#001B4266' },
  dialog: { width: '100%', maxWidth: 380, maxHeight: '100%', padding: 14, gap: 10, borderRadius: 20, backgroundColor: '#FFFFFF' },
  calendarScroll: { flexGrow: 0, flexShrink: 1 },
  monthNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#EDF4FE' },
  arrowText: { fontSize: 28, color: BLUE },
  monthLabel: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#173F6B' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: 8, color: '#52637C', fontWeight: '600' },
  dayCell: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 16, color: '#173F6B' },
  selectedDay: { backgroundColor: BLUE },
  selectedDayText: { color: '#FFFFFF', fontWeight: '700' },
  timePreview: { textAlign: 'center', color: '#173F6B', fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timeColumns: { flexDirection: 'row', gap: 12, minHeight: 0, flexShrink: 1 },
  timeColumn: { flex: 1, minHeight: 0, padding: 6, borderRadius: 12, backgroundColor: '#EDF4FE' },
  timeLabel: { textAlign: 'center', fontWeight: '600', color: '#52637C', marginBottom: 6 },
  timeList: { flexGrow: 0, flexShrink: 1, height: ROW_HEIGHT * 3 },
  timeOption: { height: ROW_HEIGHT, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  timeNumber: { fontSize: 20, fontVariant: ['tabular-nums'], color: '#173F6B' },
  selectedTime: { backgroundColor: '#D5E7FF' },
  selectedTimeNumber: { color: '#004BA8', fontWeight: '700' },
});

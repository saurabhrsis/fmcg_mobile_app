import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { formatDate } from '../../utils/formatters';

interface DatePickerFieldProps {
  label?: string;
  value: string; // ISO YYYY-MM-DD or ''
  onChange: (iso: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  containerStyle?: ViewStyle;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const toIso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const todayIso = () => {
  const t = new Date();
  return toIso(t.getFullYear(), t.getMonth(), t.getDate());
};

/**
 * Tap-to-open calendar date field. Pure RN implementation (no native deps) so
 * it works identically in Expo Go, on-device builds and web. Value is kept as
 * an ISO YYYY-MM-DD string — the same format the SQLite layer stores.
 */
export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  allowClear = false,
  containerStyle,
}) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  // Month currently shown in the calendar grid.
  const initial = value && !isNaN(new Date(value).getTime()) ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const openPicker = () => {
    const base = value && !isNaN(new Date(value).getTime()) ? new Date(value) : new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  // Build the day grid for the visible month (leading blanks for alignment).
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isoToday = todayIso();

  const pick = (day: number) => {
    onChange(toIso(viewYear, viewMonth, day));
    setOpen(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={openPicker}
        style={[styles.field, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
      >
        <Ionicons name="calendar-outline" size={17} color={colors.palette.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.fieldText, { color: value ? colors.text : colors.textMuted }]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        {allowClear && value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.calBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {/* Month / Year header */}
            <View style={styles.calHeader}>
              <View style={styles.navGroup}>
                <TouchableOpacity onPress={() => setViewYear(viewYear - 1)} style={styles.navBtn}>
                  <Ionicons name="play-back-outline" size={16} color={colors.palette.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={18} color={colors.palette.primary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.calTitle, { color: colors.text }]}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>

              <View style={styles.navGroup}>
                <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn}>
                  <Ionicons name="chevron-forward" size={18} color={colors.palette.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setViewYear(viewYear + 1)} style={styles.navBtn}>
                  <Ionicons name="play-forward-outline" size={16} color={colors.palette.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekday header */}
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={[styles.weekDay, { color: colors.textMuted }]}>{w}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.daysGrid}>
              {cells.map((day, idx) => {
                if (day === null) {
                  return <View key={idx} style={styles.dayCell} />;
                }
                const iso = toIso(viewYear, viewMonth, day);
                const selected = iso === value;
                const isToday = iso === isoToday;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayCell,
                      selected && { backgroundColor: colors.palette.primary, borderRadius: 8 },
                      !selected && isToday && {
                        borderWidth: 1.5,
                        borderColor: colors.palette.primary,
                        borderRadius: 8,
                      },
                    ]}
                    onPress={() => pick(day)}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: selected || isToday ? '700' : '500',
                        color: selected ? '#ffffff' : isToday ? colors.palette.primary : colors.text,
                      }}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer actions */}
            <View style={[styles.calFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => {
                  onChange(isoToday);
                  setOpen(false);
                }}
              >
                <Text style={{ color: colors.palette.primary, fontWeight: '700', fontSize: 13 }}>Today</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 18 }}>
                {allowClear && value ? (
                  <TouchableOpacity
                    onPress={() => {
                      onChange('');
                      setOpen(false);
                    }}
                  >
                    <Text style={{ color: colors.palette.danger, fontWeight: '600', fontSize: 13 }}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  fieldText: {
    flex: 1,
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBtn: {
    padding: 6,
  },
  calTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 10,
    paddingHorizontal: 2,
  },
});

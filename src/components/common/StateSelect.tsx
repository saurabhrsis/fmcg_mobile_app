import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { STATE_BY_CODE } from '../../utils/gstState';

interface StateOption {
  code: string;
  name: string;
}

const STATE_OPTIONS: StateOption[] = Object.entries(STATE_BY_CODE)
  .filter(([code]) => code !== '99')
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface StateSelectProps {
  label?: string;
  value: string; // state name (e.g. 'Maharashtra')
  onChange: (stateName: string, stateCode: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  allowClear?: boolean;
}

/**
 * Searchable dropdown of Indian states / UTs (GST state list).
 * Returns both the state name and its 2-digit GST state code.
 */
export const StateSelect: React.FC<StateSelectProps> = ({
  label = 'State',
  value,
  onChange,
  placeholder = 'Select state...',
  containerStyle,
  allowClear = false,
}) => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return STATE_OPTIONS;
    return STATE_OPTIONS.filter(
      (o) => o.name.toLowerCase().includes(q) || o.code.includes(q)
    );
  }, [search]);

  const selected = STATE_OPTIONS.find(
    (o) => o.name.toLowerCase() === String(value || '').trim().toLowerCase()
  );
  const displayText = selected ? selected.name : String(value || '').trim();

  const openModal = () => {
    setSearch('');
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={openModal}
        style={[styles.trigger, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
      >
        <Text
          style={[styles.triggerText, { color: displayText ? colors.text : colors.textMuted }]}
          numberOfLines={1}
        >
          {displayText || placeholder}
        </Text>
        {selected && (
          <View style={[styles.codeBadge, { backgroundColor: colors.palette.primaryLight }]}>
            <Text style={[styles.codeBadgeText, { color: colors.palette.primary }]}>{selected.code}</Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>{label || 'Select State'}</Text>

            <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search state or code..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                allowClear ? (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => {
                      onChange('', '');
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[styles.optionText, { color: colors.textMuted, fontStyle: 'italic' }]}>
                      — Clear selection —
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No matching state</Text>
              }
              renderItem={({ item }) => {
                const isSel = selected?.code === item.code;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      { backgroundColor: isSel ? colors.palette.primaryLight : 'transparent' },
                    ]}
                    onPress={() => {
                      onChange(item.name, item.code);
                      setModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSel ? colors.palette.primaryDark : colors.text,
                          fontWeight: isSel ? '700' : '400',
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <View style={styles.optionRight}>
                      <Text style={[styles.optionCode, { color: colors.textMuted }]}>{item.code}</Text>
                      {isSel && <Ionicons name="checkmark" size={18} color={colors.palette.primary} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: 480,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 40,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionCode: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
});

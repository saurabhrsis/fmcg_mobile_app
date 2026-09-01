import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { PALETTES } from '../../theme/palettes';

export const TopNavbar: React.FC = () => {
  const { colors, paletteKey, setPaletteKey, isDark, toggleDarkMode } = useTheme();
  const { activeBusiness, businesses, switchBusiness } = useBusiness();
  const { user } = useAuth();

  const [bizModal, setBizModal] = useState(false);
  const [themeModal, setThemeModal] = useState(false);

  return (
    <View style={[styles.navbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Business Switcher */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setBizModal(true)}
        style={[styles.bizBtn, { backgroundColor: colors.surfaceSubtle }]}
      >
        <Ionicons name="business" size={16} color={colors.palette.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.bizName, { color: colors.text }]} numberOfLines={1}>
          {activeBusiness ? activeBusiness.name : 'Select Business'}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      {/* Right Actions */}
      <View style={styles.actions}>
        {/* Dark Mode Toggle */}
        <TouchableOpacity
          onPress={toggleDarkMode}
          style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle }]}
        >
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={18}
            color={isDark ? '#f59e0b' : colors.text}
          />
        </TouchableOpacity>

        {/* Theme Palette Switcher */}
        <TouchableOpacity
          onPress={() => setThemeModal(true)}
          style={[styles.actionBtn, { backgroundColor: colors.palette.primaryLight }]}
        >
          <View style={[styles.colorDot, { backgroundColor: colors.palette.primary }]} />
        </TouchableOpacity>
      </View>

      {/* Business Switch Modal */}
      <Modal visible={bizModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBizModal(false)}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Switch Business (Firm)</Text>
            <FlatList
              data={businesses}
              keyExtractor={(b) => String(b.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.bizItem,
                    {
                      backgroundColor:
                        item.id === activeBusiness?.id ? colors.palette.primaryLight : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    switchBusiness(item.id);
                    setBizModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.bizItemName,
                        {
                          color: item.id === activeBusiness?.id ? colors.palette.primaryDark : colors.text,
                          fontWeight: item.id === activeBusiness?.id ? '700' : '500',
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.bizItemGst, { color: colors.textMuted }]}>
                      {item.gstin ? `GSTIN: ${item.gstin}` : 'No GSTIN'} • {item.state || 'India'}
                    </Text>
                  </View>
                  {item.id === activeBusiness?.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.palette.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Theme Picker Modal */}
      <Modal visible={themeModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setThemeModal(false)}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Theme Palette</Text>
            <View style={styles.paletteGrid}>
              {Object.values(PALETTES).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.paletteChip,
                    {
                      borderColor: paletteKey === p.id ? p.primary : colors.border,
                      backgroundColor: paletteKey === p.id ? p.primaryLight : colors.surfaceSubtle,
                    },
                  ]}
                  onPress={() => {
                    setPaletteKey(p.id);
                    setThemeModal(false);
                  }}
                >
                  <View style={[styles.paletteCircle, { backgroundColor: p.primary }]} />
                  <Text
                    style={[
                      styles.paletteName,
                      {
                        color: paletteKey === p.id ? p.primaryDark : colors.text,
                        fontWeight: paletteKey === p.id ? '700' : '400',
                      },
                    ]}
                  >
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: '65%',
  },
  bizName: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxHeight: 450,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  bizItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  bizItemName: {
    fontSize: 14,
  },
  bizItemGst: {
    fontSize: 11,
    marginTop: 2,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paletteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    width: '48%',
  },
  paletteCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  paletteName: {
    fontSize: 12,
  },
});

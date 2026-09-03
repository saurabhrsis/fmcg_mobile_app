import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { PALETTES } from '../../theme/palettes';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Ionicons } from '@expo/vector-icons';

export const ThemeSettingsScreen: React.FC = () => {
  const { colors, paletteKey, setPaletteKey, isDark, toggleDarkMode } = useTheme();

  return (
    <ScreenWrapper title="Theme & Appearance" subtitle="Personalize colors & dark mode">
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Theme & Appearance</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Personalize colors, contrast & dark mode
        </Text>

        {/* Dark Mode Switch */}
        <Card>
          <TouchableOpacity style={styles.darkRow} onPress={toggleDarkMode}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.darkLabel, { color: colors.text }]}>Dark Mode</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                Optimized high-contrast dark theme for low light billing
              </Text>
            </View>
            <Ionicons
              name={isDark ? 'toggle' : 'toggle-outline'}
              size={36}
              color={isDark ? colors.palette.primary : colors.textMuted}
            />
          </TouchableOpacity>
        </Card>

        {/* 8 Color Palettes */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
            Accent Color Schemes
          </Text>

          <View style={styles.paletteGrid}>
            {Object.values(PALETTES).map((p) => {
              const isSelected = paletteKey === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.paletteCard,
                    {
                      borderColor: isSelected ? p.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                      backgroundColor: isSelected ? (isDark ? colors.surfaceSubtle : p.primaryLight) : colors.surfaceSubtle,
                    },
                  ]}
                  onPress={() => setPaletteKey(p.id)}
                >
                  <View style={[styles.colorCircle, { backgroundColor: p.primary }]} />
                  <Text
                    style={[
                      styles.paletteName,
                      {
                        color: isSelected ? (isDark ? colors.text : p.primaryDark) : colors.text,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {p.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={p.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  darkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  darkLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  paletteGrid: {
    gap: 8,
  },
  paletteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  colorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  paletteName: {
    flex: 1,
    fontSize: 13,
  },
});

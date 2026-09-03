import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { PALETTES } from '../../theme/palettes';

export interface TopNavbarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  hideActions?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  title,
  subtitle,
  showBack,
  onBack,
  rightAction,
  hideActions = false,
}) => {
  const { colors, paletteKey, setPaletteKey, isDark, toggleDarkMode } = useTheme();
  const { activeBusiness, businesses, switchBusiness } = useBusiness();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [bizModal, setBizModal] = useState(false);
  const [themeModal, setThemeModal] = useState(false);

  // Auto-detect if back button should be shown
  const canGoBack = showBack !== undefined ? showBack : (navigation?.canGoBack ? navigation.canGoBack() : false);

  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View
      style={[
        styles.navbar,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Left Area: Back Button or Business Switcher */}
      <View style={styles.leftArea}>
        {canGoBack ? (
          <View style={styles.backGroup}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBackPress}
              style={[
                styles.navBtn,
                styles.backBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {title || (activeBusiness ? activeBusiness.name : 'Back')}
              </Text>
              {subtitle ? (
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          /* Business Switcher for Root/Tab Screens */
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setBizModal(true)}
            style={[
              styles.bizBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="business" size={16} color={colors.palette.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.bizName, { color: colors.text }]} numberOfLines={1}>
              {title || (activeBusiness ? activeBusiness.name : 'Select Business')}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Right Actions */}
      <View style={styles.actions}>
        {rightAction}

        {!hideActions && (
          <>
            {/* Dark Mode Toggle */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleDarkMode}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel="Toggle Dark Mode"
              accessibilityRole="button"
            >
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={18}
                color={isDark ? '#f59e0b' : colors.text}
              />
            </TouchableOpacity>

            {/* Theme Palette Switcher */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setThemeModal(true)}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : colors.palette.primaryLight,
                  borderColor: colors.palette.primary,
                },
              ]}
              accessibilityLabel="Choose Theme"
              accessibilityRole="button"
            >
              <View style={[styles.colorDot, { backgroundColor: colors.palette.primary }]} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Business Switch Modal */}
      <Modal visible={bizModal} transparent animationType="fade" onRequestClose={() => setBizModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBizModal(false)}
        >
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 16) + 16,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Switch Business (Firm)</Text>
              <TouchableOpacity onPress={() => setBizModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={businesses}
              keyExtractor={(b) => String(b.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.bizItem,
                    {
                      backgroundColor:
                        item.id === activeBusiness?.id ? colors.palette.primaryLight : colors.surfaceSubtle,
                      borderColor: item.id === activeBusiness?.id ? colors.palette.primary : colors.border,
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
                          fontWeight: item.id === activeBusiness?.id ? '700' : '600',
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
                    <Ionicons name="checkmark-circle" size={22} color={colors.palette.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Theme Picker Modal */}
      <Modal visible={themeModal} transparent animationType="fade" onRequestClose={() => setThemeModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setThemeModal(false)}
        >
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 16) + 16,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Theme Palette</Text>
              <TouchableOpacity onPress={() => setThemeModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
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
                        fontWeight: paletteKey === p.id ? '700' : '500',
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  leftArea: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  backGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBtn: {
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  bizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
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
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
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
    maxWidth: 480,
    maxHeight: 480,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  bizItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
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
    justifyContent: 'space-between',
  },
  paletteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    width: '48%',
  },
  paletteCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  paletteName: {
    fontSize: 12,
  },
});

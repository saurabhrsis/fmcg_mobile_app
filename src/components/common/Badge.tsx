import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary', style }) => {
  const getTheme = () => {
    switch (variant) {
      case 'success':
        return { bg: '#dcfce7', text: '#15803d' };
      case 'warning':
        return { bg: '#fef3c7', text: '#b45309' };
      case 'danger':
        return { bg: '#ffe4e6', text: '#be123c' };
      case 'info':
        return { bg: '#e0e7ff', text: '#4338ca' };
      case 'neutral':
        return { bg: '#f1f5f9', text: '#475569' };
      case 'primary':
      default:
        return { bg: '#ccfbf1', text: '#0f766e' };
    }
  };

  const t = getTheme();

  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

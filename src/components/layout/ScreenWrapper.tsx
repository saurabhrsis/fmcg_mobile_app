import React from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { TopNavbar, TopNavbarProps } from './TopNavbar';
import { LicenseBanner } from './LicenseBanner';

export interface ScreenWrapperProps extends TopNavbarProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  withBottomInset?: boolean;
  edges?: readonly ('top' | 'right' | 'bottom' | 'left')[];
  avoidKeyboard?: boolean;
  keyboardVerticalOffset?: number;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  showNavbar = true,
  title,
  subtitle,
  showBack,
  onBack,
  rightAction,
  hideActions,
  withBottomInset,
  edges,
  avoidKeyboard = true,
  keyboardVerticalOffset,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const canGoBack = navigation?.canGoBack ? navigation.canGoBack() : false;
  // If not explicitly set, inner screens (canGoBack = true) get bottom inset applied,
  // while tab screens (canGoBack = false) let the bottom tab bar handle it.
  const applyBottomInset = withBottomInset !== undefined ? withBottomInset : canGoBack;

  const resolvedEdges = edges || ['top', 'left', 'right'];

  const content = (
    <View
      style={[
        styles.content,
        { backgroundColor: colors.bg },
        applyBottomInset && { paddingBottom: insets.bottom },
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={resolvedEdges}
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      {showNavbar && (
        <TopNavbar
          title={title}
          subtitle={subtitle}
          showBack={showBack}
          onBack={onBack}
          rightAction={rightAction}
          hideActions={hideActions}
        />
      )}
      <LicenseBanner />
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardVerticalOffset ?? 0}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

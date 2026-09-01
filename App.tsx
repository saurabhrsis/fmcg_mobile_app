import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { BusinessProvider } from './src/context/BusinessContext';
import { AuthProvider } from './src/context/AuthContext';
import { FeaturesProvider } from './src/context/FeaturesContext';
import { RootNavigator } from './src/navigation/RootNavigator';

const AppContent: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <BusinessProvider>
          <AuthProvider>
            <FeaturesProvider>
              <AppContent />
            </FeaturesProvider>
          </AuthProvider>
        </BusinessProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

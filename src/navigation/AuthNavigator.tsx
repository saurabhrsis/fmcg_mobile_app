import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

const Stack = createNativeStackNavigator();

interface AuthNavigatorProps {
  /** The app always opens on the Login page — returning users sign in directly. */
  initialRouteName?: 'Login' | 'Register';
  /** True on a fresh install (no accounts yet) — Login shows a prominent "Create Account" CTA. */
  firstRun?: boolean;
}

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({
  initialRouteName = 'Login',
  firstRun = false,
}) => {
  return (
    <Stack.Navigator
      id="AuthStack"
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} initialParams={{ firstRun }} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login } = useAuth();
  const { colors } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter username or mobile');
      return;
    }
    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      if (!res.success) {
        Alert.alert('Login Failed', res.error || 'Invalid credentials');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.palette.primary }]}>
            <Ionicons name="cart" size={44} color="#FFF" />
          </View>
          <Text style={[styles.appTitle, { color: colors.text }]}>FMCG Mobile Suite</Text>
          <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>
            Enterprise FMCG & Retail ERP Solution
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.palette.primaryLight }]}>
            <Text style={[styles.badgeText, { color: colors.palette.primary }]}>
              v2.5.0 • Desktop Sync Compatible
            </Text>
          </View>
        </View>

        {/* Login Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Sign In to Account</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Username / Mobile</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter username or mobile"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password / PIN</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter password or PIN"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.palette.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={[styles.forgotLinkText, { color: colors.palette.primary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Register */}
        <View style={[styles.registerCard, { backgroundColor: colors.palette.primaryLight, borderColor: colors.palette.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.registerTitle, { color: colors.palette.primary }]}>
              New to FMCG Suite?
            </Text>
            <Text style={[styles.registerDesc, { color: colors.textSecondary }]}>
              Register your account & business to start billing in minutes.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.registerButton, { backgroundColor: colors.palette.primary }]}
            onPress={() => navigation.navigate('Register')}
          >
            <Ionicons name="person-add-outline" size={16} color="#FFF" />
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Supports GST Compliance • FEFO Batches • Multi-Tier Units
          </Text>
          <Text style={[styles.footerTextSub, { color: colors.textMuted }]}>
            Offline-First SQLite Database Engine
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 15,
  },
  eyeIcon: {
    padding: 6,
  },
  loginButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  forgotLink: {
    alignItems: 'center',
    marginTop: 14,
  },
  forgotLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  registerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginTop: 18,
    gap: 12,
  },
  registerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  registerDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerTextSub: {
    fontSize: 11,
    marginTop: 2,
  },
});

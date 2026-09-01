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
import { seedDatabase } from '../../db/database';

export const LoginScreen: React.FC = () => {
  const { login, checkSetupStatus } = useAuth();
  const { colors } = useTheme();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleLogin = async (u = username, p = password) => {
    if (!u.trim()) {
      Alert.alert('Error', 'Please enter username or mobile');
      return;
    }
    setLoading(true);
    try {
      const res = await login(u.trim(), p);
      if (!res.success) {
        Alert.alert('Login Failed', res.error || 'Invalid credentials');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSeedAndLogin = async () => {
    setSeeding(true);
    try {
      await seedDatabase();
      await checkSetupStatus();
      await handleLogin('admin', 'admin123');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
            onPress={() => handleLogin()}
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

          {/* Quick Demo Logins */}
          <View style={styles.quickSection}>
            <Text style={[styles.quickTitle, { color: colors.textMuted }]}>Quick Login Options:</Text>
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={[styles.quickBadge, { backgroundColor: colors.palette.primaryLight }]}
                onPress={() => {
                  setUsername('admin');
                  setPassword('admin123');
                  handleLogin('admin', 'admin123');
                }}
              >
                <Text style={[styles.quickBadgeText, { color: colors.palette.primary }]}>Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickBadge, { backgroundColor: colors.palette.secondaryLight }]}
                onPress={() => {
                  setUsername('cashier');
                  setPassword('cashier123');
                  handleLogin('cashier', 'cashier123');
                }}
              >
                <Text style={[styles.quickBadgeText, { color: colors.palette.secondary }]}>Cashier</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickBadge, { backgroundColor: '#F3E8FF' }]}
                onPress={() => {
                  setUsername('manager');
                  setPassword('mgr123');
                  handleLogin('manager', 'mgr123');
                }}
              >
                <Text style={[styles.quickBadgeText, { color: '#7E22CE' }]}>Manager</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Seed Demo DB Button */}
          <TouchableOpacity
            style={[styles.seedButton, { borderColor: colors.border }]}
            onPress={handleQuickSeedAndLogin}
            disabled={seeding}
          >
            {seeding ? (
              <ActivityIndicator color={colors.palette.primary} size="small" />
            ) : (
              <>
                <Ionicons name="refresh-circle-outline" size={18} color={colors.palette.primary} />
                <Text style={[styles.seedButtonText, { color: colors.palette.primary }]}>
                  Reset & Load Complete Demo Data
                </Text>
              </>
            )}
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
  quickSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  quickTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBadge: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 16,
    gap: 6,
  },
  seedButtonText: {
    fontSize: 13,
    fontWeight: '600',
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

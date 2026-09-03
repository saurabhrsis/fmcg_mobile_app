import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export const SetupAdminScreen: React.FC = () => {
  const { colors } = useTheme();
  const { checkSetupStatus } = useAuth();

  const [name, setName] = useState('Admin User');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [secQuestion, setSecQuestion] = useState('What is your birth town?');
  const [secAnswer, setSecAnswer] = useState('Delhi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    if (!name.trim() || !username.trim() || !password || !secAnswer.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.registerAdmin({
        name,
        username,
        password,
        sec_question: secQuestion,
        sec_answer: secAnswer,
      });
      await checkSetupStatus();
    } catch (e: any) {
      setError(e.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.logoBox, { backgroundColor: colors.palette.primaryLight }]}>
          <Ionicons name="shield-checkmark" size={36} color={colors.palette.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Initial Admin Setup</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Create the master administrator account for RightServe FMCG
        </Text>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: '#ffe4e6' }]}>
            <Text style={{ color: '#be123c', fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Full Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rahul Sharma"
          icon="person-outline"
        />

        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="e.g. admin"
          autoCapitalize="none"
          icon="at-outline"
        />

        <Input
          label="Master Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Set a strong password"
          secureTextEntry
          icon="lock-closed-outline"
        />

        <Input
          label="Security Question (for recovery)"
          value={secQuestion}
          onChangeText={setSecQuestion}
          placeholder="e.g. What is your first school?"
          icon="help-circle-outline"
        />

        <Input
          label="Security Answer"
          value={secAnswer}
          onChangeText={setSecAnswer}
          placeholder="Enter answer"
          icon="key-outline"
        />

        <Button
          title="Create Master Account"
          onPress={handleSetup}
          loading={loading}
          style={{ marginTop: 12 }}
        />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [question, setQuestion] = useState('');
  const [username, setUsername] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const q = await authService.getAdminRecoveryQuestion();
      if (q) {
        setQuestion(q.question);
        setUsername(q.username);
      } else {
        setError('No security question configured for administrator.');
      }
    })();
  }, []);

  const handleReset = async () => {
    if (!answer.trim() || !newPassword) {
      setError('Please provide the security answer and new password');
      return;
    }
    setError('');
    setLoading(true);
    const ok = await authService.resetPasswordWithSecurityAnswer(answer, newPassword);
    setLoading(false);
    if (ok) {
      Alert.alert('Success', 'Password has been reset successfully. Please login.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } else {
      setError('Incorrect answer to the security question.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        enabled
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 24) + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.logoBox, { backgroundColor: colors.palette.primaryLight }]}>
              <Ionicons name="key" size={32} color={colors.palette.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Answer your security question to reset the admin password offline
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#ffe4e6' }]}>
                <Text style={{ color: '#be123c', fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <View style={[styles.questionBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.qLabel, { color: colors.textMuted }]}>Security Question for ({username}):</Text>
              <Text style={[styles.qText, { color: colors.text }]}>{question || 'Loading question...'}</Text>
            </View>

            <Input
              label="Your Answer"
              value={answer}
              onChangeText={setAnswer}
              placeholder="Enter the secret answer"
              icon="help-outline"
            />

            <Input
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password (min 4 chars)"
              secureTextEntry
              icon="lock-closed-outline"
            />

            <Button
              title="Reset & Update Password"
              onPress={handleReset}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            <Button
              title="Back to Login"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={{ marginTop: 10 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
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
  questionBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  qLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  qText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
});

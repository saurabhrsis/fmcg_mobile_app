import React, { useRef, useState } from 'react';
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
  findNodeHandle,
  UIManager,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../../services/authService';
import { StateSelect } from '../../components/common/StateSelect';
import { Select } from '../../components/common/Select';
import { stateCode as toStateCode, isValidGstinFormat, STATE_BY_CODE } from '../../utils/gstState';
import { setPendingNav } from '../../utils/pendingNav';

const SECURITY_QUESTIONS = [
  'What is your mother\u2019s maiden name?',
  'What was the name of your first school?',
  'What is your favourite food?',
  'In which city were you born?',
  'What was your childhood nickname?',
];

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login, checkSetupStatus } = useAuth();
  const { createBusiness, refreshBusinesses } = useBusiness();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  /**
   * Scroll the exact focused field above the keyboard (real-device fix).
   * KAV shrinks the view, then this pans the ScrollView so the tapped
   * TextInput is not hidden behind the keyboard.
   */
  const focusScroll = (e: any) => {
    const target = e?.target;
    if (target == null) return;
    setTimeout(() => {
      try {
        const scrollNode = findNodeHandle(scrollRef.current);
        if (!scrollNode) return;
        (UIManager as any).measureLayout(
          target,
          scrollNode,
          () => {},
          (_x: number, y: number) => {
            scrollRef.current?.scrollTo({ y: Math.max(y - 120, 0), animated: true });
          }
        );
      } catch {
        /* ignore measure errors */
      }
    }, 120);
  };

  // User account
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [secQuestion, setSecQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [secAnswer, setSecAnswer] = useState('');

  // Business
  const [bizName, setBizName] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [stateCd, setStateCd] = useState('');

  const [loading, setLoading] = useState(false);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
  ];

  const handleGstinChange = (t: string) => {
    const up = t.toUpperCase();
    setGstin(up);
    if (up.length >= 2 && /^\d{2}/.test(up)) {
      const code = up.substring(0, 2);
      setStateCd(code);
      const name = STATE_BY_CODE[code];
      if (name) setState(name);
    }
  };

  const handleRegister = async () => {
    // ---- validation ----
    if (!fullName.trim()) return Alert.alert('Required', 'Please enter your full name');
    if (!username.trim()) return Alert.alert('Required', 'Please enter a username or mobile number');
    if (!password || password.length < 4) return Alert.alert('Weak Password', 'Password must be at least 4 characters');
    if (password !== confirmPassword) return Alert.alert('Mismatch', 'Password and Confirm Password do not match');
    if (!secAnswer.trim()) return Alert.alert('Required', 'Please answer the security question (used for password recovery)');
    if (!bizName.trim()) return Alert.alert('Required', 'Please enter your Business Name');
    if (!state.trim()) return Alert.alert('Required', 'Please select your State (needed for GST calculations)');
    if (gstin.trim() && !isValidGstinFormat(gstin)) {
      return Alert.alert('Invalid GSTIN', 'The GSTIN format looks incorrect. It should be like 27AABCA1234F1Z5. Leave it blank if unregistered.');
    }

    setLoading(true);
    try {
      // 1. Create the admin user account
      await authService.registerAdmin({
        name: fullName.trim(),
        username: username.trim(),
        password,
        sec_question: secQuestion,
        sec_answer: secAnswer,
      });

      // 2. Create the business profile
      const biz = await createBusiness({
        name: bizName.trim(),
        gstin: gstin.trim().toUpperCase(),
        phone: phone.trim(),
        email: email.trim(),
        address: [address.trim(), city.trim()].filter(Boolean).join(', '),
        state: state.trim(),
        state_code: stateCd || toStateCode(state, gstin),
        invoice_prefix: 'INV',
        terms: 'Goods once sold will not be taken back.',
        fy_start_month: 4,
        is_default: 1,
        active: 1,
        bill_number_start: 1,
        bill_format: 'classic',
        bill_color: '#0f766e',
        created_at: new Date().toISOString(),
      } as any);

      await refreshBusinesses();
      await checkSetupStatus();

      // 3. Auto-login and land on the Business Profile editor so the
      //    user can complete / update their business details.
      if (biz?.id) {
        setPendingNav('BusinessForm', { id: biz.id });
      }
      const res = await login(username.trim(), password);
      if (!res.success) {
        Alert.alert('Registered', 'Account created. Please sign in with your new credentials.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        enabled
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.palette.primary }]}>
              <Ionicons name="person-add" size={34} color="#FFF" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Create Your Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Register yourself and your business to get started
            </Text>
          </View>

          {/* ---- User Account ---- */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={20} color={colors.palette.primary} />
              <Text style={[styles.sectionTitle, { color: colors.palette.primary }]}>Your Account</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                onFocus={focusScroll}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Username / Mobile *</Text>
              <TextInput
                style={inputStyle}
                placeholder="Used for signing in"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                onFocus={focusScroll}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Password *</Text>
                <View style={[styles.pwWrapper, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.pwInput, { color: colors.text }]}
                    placeholder="Min 4 characters"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onFocus={focusScroll}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                onFocus={focusScroll}
              />
              </View>
            </View>

            <Select
              label="Security Question (for password recovery)"
              options={SECURITY_QUESTIONS.map((q) => ({ label: q, value: q }))}
              value={secQuestion}
              onChange={setSecQuestion}
            />

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Security Answer *</Text>
              <TextInput
                style={inputStyle}
                placeholder="Your answer"
                placeholderTextColor={colors.textMuted}
                value={secAnswer}
                onChangeText={setSecAnswer}
                onFocus={focusScroll}
              />
            </View>
          </View>

          {/* ---- Business Details ---- */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business-outline" size={20} color={colors.palette.primary} />
              <Text style={[styles.sectionTitle, { color: colors.palette.primary }]}>Your Business</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Business / Trade Name *</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. Apex FMCG Distributors"
                placeholderTextColor={colors.textMuted}
                value={bizName}
                onChangeText={setBizName}
                onFocus={focusScroll}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>GSTIN (optional)</Text>
              <TextInput
                style={inputStyle}
                placeholder="27AABCA1234F1Z5"
                placeholderTextColor={colors.textMuted}
                value={gstin}
                onChangeText={handleGstinChange}
                autoCapitalize="characters"
                maxLength={15}
                onFocus={focusScroll}
              />
            </View>

            <StateSelect
              label="State *"
              value={state}
              onChange={(name, code) => {
                setState(name);
                setStateCd(code);
              }}
            />

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Business Mobile</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="9876543210"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                onFocus={focusScroll}
              />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="billing@business.in"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                onFocus={focusScroll}
              />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Address</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Shop No. 12, APMC Market"
                  placeholderTextColor={colors.textMuted}
                  value={address}
                  onChangeText={setAddress}
                onFocus={focusScroll}
              />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>City</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Nagpur"
                  placeholderTextColor={colors.textMuted}
                  value={city}
                  onChangeText={setCity}
                onFocus={focusScroll}
              />
              </View>
            </View>

            <Text style={[styles.hint, { color: colors.textMuted }]}>
              After registration you will be taken to the Business Profile screen where you can
              complete bank details, logo, signature and bill format.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, { backgroundColor: colors.palette.primary }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>Register & Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: colors.palette.primary, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
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
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 18,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  pwWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  pwInput: {
    flex: 1,
    fontSize: 14,
    height: 44,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  registerButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 14,
  },
});

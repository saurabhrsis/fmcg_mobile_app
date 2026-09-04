import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Ionicons } from '@expo/vector-icons';
import { syncService, MergeStats } from '../../services/syncService';

type Busy = '' | 'test' | 'push' | 'pull' | 'full' | 'export' | 'import';

export const DesktopSyncScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { refreshBusinesses, businesses } = useBusiness();

  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [lastPushAt, setLastPushAt] = useState('');
  const [lastPullAt, setLastPullAt] = useState('');
  const [busy, setBusy] = useState<Busy>('');
  const [connStatus, setConnStatus] = useState<{ ok: boolean; message: string } | null>(null);
  // Manual URL / key entry is the fallback — scanning the desktop QR is primary.
  const [manualOpen, setManualOpen] = useState(false);
  const [paired, setPaired] = useState(false);

  const loadConfig = async () => {
    const cfg = await syncService.getConfig();
    setUrl(cfg.url);
    setApiKey(cfg.apiKey);
    setLastPushAt(cfg.lastPushAt);
    setLastPullAt(cfg.lastPullAt);
    setPaired(!!(cfg.url && cfg.apiKey));
    return cfg;
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Coming back from the QR scanner: pick up the freshly saved pairing details.
  useFocusEffect(
    React.useCallback(() => {
      loadConfig();
    }, [])
  );

  const fmtTime = (iso: string) =>
    iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

  const saveConfig = async () => {
    await syncService.saveConfig(url, apiKey);
  };

  const showStats = (title: string, stats: MergeStats) => {
    Alert.alert(title, syncService.summarizeStats(stats));
  };

  // ---------------- network actions ----------------

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setConnStatus({
        ok: false,
        message: 'The API key is required — scan the desktop pairing QR or paste the key shown under it.',
      });
      setManualOpen(true);
      return;
    }
    setBusy('test');
    setConnStatus(null);
    try {
      await saveConfig();
      const res = await syncService.testConnection(url, apiKey);
      setConnStatus(res);
    } finally {
      setBusy('');
    }
  };

  const handlePush = async () => {
    if (!url.trim() || !apiKey.trim()) {
      Alert.alert(
        'Not Paired Yet',
        'Scan the pairing QR on your desktop first (Settings → Mobile Sync). The QR supplies both the address and the required API key.'
      );
      return;
    }
    setBusy('push');
    try {
      await saveConfig();
      const { records } = await syncService.pushToDesktop(url, apiKey);
      setLastPushAt(new Date().toISOString());
      Alert.alert('Push Complete', `${records} records sent to the desktop portal.`);
    } catch (e: any) {
      Alert.alert('Push Failed', e.message);
    } finally {
      setBusy('');
    }
  };

  const handlePull = async () => {
    if (!url.trim() || !apiKey.trim()) {
      Alert.alert(
        'Not Paired Yet',
        'Scan the pairing QR on your desktop first (Settings → Mobile Sync). The QR supplies both the address and the required API key.'
      );
      return;
    }
    setBusy('pull');
    try {
      await saveConfig();
      const stats = await syncService.pullFromDesktop(url, apiKey);
      setLastPullAt(new Date().toISOString());
      await refreshBusinesses();
      showStats('Pull Complete', stats);
    } catch (e: any) {
      Alert.alert('Pull Failed', e.message);
    } finally {
      setBusy('');
    }
  };

  const handleFullSync = async () => {
    if (!url.trim() || !apiKey.trim()) {
      Alert.alert(
        'Not Paired Yet',
        'Scan the pairing QR on your desktop first (Settings → Mobile Sync). The QR supplies both the address and the required API key.'
      );
      return;
    }
    setBusy('full');
    try {
      await saveConfig();
      const stats = await syncService.pullFromDesktop(url, apiKey);
      const { records } = await syncService.pushToDesktop(url, apiKey);
      const now = new Date().toISOString();
      setLastPullAt(now);
      setLastPushAt(now);
      await refreshBusinesses();
      Alert.alert(
        'Sync Complete',
        `${syncService.summarizeStats(stats)}\n${records} records sent back to the desktop portal.`
      );
    } catch (e: any) {
      Alert.alert('Sync Failed', e.message);
    } finally {
      setBusy('');
    }
  };

  // ---------------- file actions ----------------

  const handleExportFile = async () => {
    setBusy('export');
    try {
      const { fileName, records } = await syncService.exportSyncFile();
      Alert.alert('Sync File Ready', `${fileName}\n${records} records packaged. Import this file in the desktop portal.`);
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setBusy('');
    }
  };

  const readPickedFile = async (): Promise<string | null> => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets || res.assets.length === 0) return null;
    const file = res.assets[0];
    if (Platform.OS === 'web' && (file as any).file) {
      return await (file as any).file.text();
    }
    return await FileSystem.readAsStringAsync(file.uri);
  };

  const handleImportFile = async () => {
    try {
      const content = await readPickedFile();
      if (!content) return;
      const pkg = syncService.parsePackage(content);
      const totalIncoming = Object.values(pkg.data).reduce(
        (a, rows) => a + (Array.isArray(rows) ? rows.length : 0),
        0
      );

      const doApply = async (mode: 'merge' | 'replace') => {
        setBusy('import');
        try {
          const stats = await syncService.applyPackage(pkg, mode);
          await refreshBusinesses();
          if (stats) showStats('Merge Complete', stats);
          else Alert.alert('Replace Complete', 'Local database replaced with the imported data.');
        } catch (e: any) {
          Alert.alert('Import Failed', e.message);
        } finally {
          setBusy('');
        }
      };

      Alert.alert(
        'Import Sync File',
        `Package from ${pkg.source || 'desktop'} • ${totalIncoming} records${pkg.exportedAt ? `\nExported: ${fmtTime(pkg.exportedAt)}` : ''}\n\nMerge keeps all existing data and only adds records that are missing locally. Replace wipes this device first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace All', style: 'destructive', onPress: () => doApply('replace') },
          { text: 'Merge (Recommended)', onPress: () => doApply('merge') },
        ]
      );
    } catch (e: any) {
      Alert.alert('Import Failed', e.message);
    }
  };

  // ---------------- UI ----------------

  const ActionRow: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    title: string;
    sub: string;
    onPress: () => void;
    loading: boolean;
    disabled?: boolean;
  }> = ({ icon, color, title, sub, onPress, loading, disabled }) => (
    <TouchableOpacity
      style={[styles.actionRow, { borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled || busy !== ''}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.actionSub, { color: colors.textMuted }]}>{sub}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper title="Desktop Sync" subtitle="Exchange data with desktop portal">
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>Desktop Portal Sync</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Two-way data exchange with the RightServe desktop application
        </Text>

      {/* Welcome banner for users who chose "copy from desktop" at registration */}
      {route?.params?.welcome && businesses.length === 0 && (
        <View style={[styles.welcomeBox, { backgroundColor: '#ECFDF5', borderColor: '#16A34A' }]}>
          <Ionicons name="download-outline" size={22} color="#16A34A" />
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>Copy your PC data to this phone</Text>
            <Text style={styles.welcomeText}>
              No need to type your business details again — scan the QR shown in the desktop app
              (Settings → Mobile Sync) and tap “Full Sync”. Your firm, items, parties and bills come
              across automatically.
            </Text>
          </View>
        </View>
      )}

      {/* Hero + first-run setup */}
      <Card>
        <View style={styles.heroRow}>
          <Ionicons name="phone-portrait-outline" size={26} color={colors.palette.primary} />
          <Ionicons name="sync-outline" size={20} color={colors.textMuted} style={{ marginHorizontal: 8 }} />
          <Ionicons name="desktop-outline" size={26} color={colors.palette.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Two-Way Data Sync</Text>
            <Text style={[styles.heroSub, { color: colors.textMuted }]}>
              Move billing, inventory & party data between this device and the RightServe desktop portal.
            </Text>
          </View>
        </View>

        {/* Set up on desktop, then scan QR and Full Sync */}
        <View style={[styles.stepsBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Text style={[styles.stepsTitle, { color: colors.text }]}>
            {paired ? 'How this phone stays in sync' : 'Set up in 4 steps'}
          </Text>
          {[
            'Create the company, items and parties on the DESKTOP app first.',
            'On the desktop open Settings → Mobile Sync and keep the pairing QR on screen.',
            'Tap “Scan QR to connect” below — the address and API key are read from the QR.',
            'Then tap “Full Sync”: the desktop data is pulled in and this phone’s data is pushed back.',
          ].map((t, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: colors.palette.primary }]}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>{t}</Text>
            </View>
          ))}
          <Text style={[styles.stepsNote, { color: colors.textMuted }]}>
            Use the SAME business name on both devices — records merge by name, item SKU, party name,
            invoice number and batch number, never by licence key. A phone with empty data imports the
            desktop firm on the first pull. Licence keys only unlock each app; desktop and mobile need
            their own key.
          </Text>
        </View>
        <View style={[styles.lastSyncRow, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.lastSyncLabel, { color: colors.textMuted }]}>Last push (mobile → desktop)</Text>
            <Text style={[styles.lastSyncVal, { color: colors.text }]}>{fmtTime(lastPushAt)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.lastSyncLabel, { color: colors.textMuted }]}>Last pull (desktop → mobile)</Text>
            <Text style={[styles.lastSyncVal, { color: colors.text }]}>{fmtTime(lastPullAt)}</Text>
          </View>
        </View>
      </Card>

      {/* Connect: scan the desktop pairing QR */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Connect to Desktop</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          Both devices must be on the same Wi-Fi network. The desktop shows the pairing QR under
          Settings → Mobile Sync — it carries the address (port 4000) and the API key, so nothing has
          to be typed.
        </Text>

        <TouchableOpacity
          style={[styles.scanBtn, { backgroundColor: colors.palette.primary }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ScanDesktopQr')}
        >
          <Ionicons name="qr-code-outline" size={22} color="#ffffff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.scanBtnTitle}>Scan QR to connect</Text>
            <Text style={styles.scanBtnSub}>Point the camera at the desktop pairing QR</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>

        {/* Pairing status */}
        <View style={[styles.pairedRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Ionicons
            name={paired ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={paired ? '#16A34A' : colors.palette.warning}
          />
          <Text style={[styles.pairedText, { color: colors.textSecondary }]} numberOfLines={2}>
            {paired
              ? `Paired with ${url}`
              : 'Not paired yet — scan the desktop QR (or enter the address and API key manually below).'}
          </Text>
        </View>

        {/* Manual fallback */}
        <TouchableOpacity
          style={styles.cantScanRow}
          activeOpacity={0.7}
          onPress={() => setManualOpen(!manualOpen)}
        >
          <Ionicons
            name={manualOpen ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={colors.palette.primary}
          />
          <Text style={[styles.cantScanText, { color: colors.palette.primary }]}>
            Can’t scan? Enter the desktop address & key manually
          </Text>
        </TouchableOpacity>

        {manualOpen && (
          <View style={{ marginTop: 10 }}>
            <Input
              label="Desktop Portal URL"
              value={url}
              onChangeText={setUrl}
              placeholder="http://192.168.1.5:4000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Input
              label="API Key (required)"
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="rsync_… — shown under the desktop QR"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={{ fontSize: 10.5, color: colors.textMuted, marginTop: -6, marginBottom: 10 }}>
              The desktop rejects requests without its API key, so sync will not work if this is left
              blank. Pasting a full endpoint such as http://192.168.1.5:4000/api/sync/push is fine —
              the /api/sync part is trimmed automatically.
            </Text>
          </View>
        )}

        {connStatus && (
          <View
            style={[
              styles.connBanner,
              {
                backgroundColor: connStatus.ok ? '#DCFCE7' : '#FEE2E2',
                borderColor: connStatus.ok ? '#16A34A' : '#DC2626',
              },
            ]}
          >
            <Ionicons
              name={connStatus.ok ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={connStatus.ok ? '#16A34A' : '#DC2626'}
            />
            <Text style={[styles.connBannerText, { color: connStatus.ok ? '#166534' : '#991B1B' }]}>
              {connStatus.message}
            </Text>
          </View>
        )}

        <ActionRow
          icon="wifi-outline"
          color={colors.palette.accent}
          title="Test Connection"
          sub={paired ? 'Check that the desktop portal is reachable' : 'Pair first — scan the desktop QR'}
          onPress={handleTest}
          loading={busy === 'test'}
        />
        <ActionRow
          icon="sync-circle-outline"
          color={colors.palette.primary}
          title="Full Sync (Recommended)"
          sub="Pull desktop data, merge, then push everything back"
          onPress={handleFullSync}
          loading={busy === 'full'}
        />
        <ActionRow
          icon="cloud-upload-outline"
          color={colors.palette.success}
          title="Push to Desktop"
          sub="Send all mobile data to the desktop portal"
          onPress={handlePush}
          loading={busy === 'push'}
        />
        <ActionRow
          icon="cloud-download-outline"
          color={colors.palette.warning}
          title="Pull from Desktop"
          sub="Fetch desktop data & merge into this device"
          onPress={handlePull}
          loading={busy === 'pull'}
        />
      </Card>

      {/* File transfer */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Offline File Transfer</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          No network needed — move a sync file via USB cable, email, WhatsApp or pen drive. The desktop
          portal exports & imports the same file format.
        </Text>

        <ActionRow
          icon="share-outline"
          color={colors.palette.primary}
          title="Export Sync File"
          sub="Package all data as a .json file to send to desktop"
          onPress={handleExportFile}
          loading={busy === 'export'}
        />
        <ActionRow
          icon="download-outline"
          color={colors.palette.accent}
          title="Import Sync File"
          sub="Load a file exported from the desktop portal"
          onPress={handleImportFile}
          loading={busy === 'import'}
        />
      </Card>

      {/* How merge works */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>How Merging Works</Text>
        {[
          'Records are matched by their identity — business name, item name & SKU, party name & type, invoice number & type, batch number — not by internal IDs, so both sides can keep billing independently.',
          'Keep the SAME business name on the phone and the PC; that is what links the two databases. The licence key does not link them — it only unlocks each app.',
          'Merge never deletes or overwrites your existing entries; it only adds records that are missing on this device ("local wins").',
          'Invoices that already exist here (same number & type) are skipped, so re-syncing never duplicates bills or stock.',
          'Each device keeps its own company profile row — fill the GSTIN on both, or pull first on a fresh phone so the businesses match.',
          'Use "Replace All" only when setting up a fresh device from a desktop export.',
        ].map((t, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="information-circle-outline" size={15} color={colors.palette.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{t}</Text>
          </View>
        ))}
      </Card>

      <View style={{ height: 30 }} />

      {/* Manual fallback — a user who skipped business entry can still set up by hand */}
      {businesses.length === 0 && (
        <TouchableOpacity
          style={[styles.manualRow, { borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('BusinessForm', {})}
        >
          <Ionicons name="create-outline" size={17} color={colors.palette.primary} />
          <Text style={[styles.manualText, { color: colors.palette.primary }]}>
            Prefer to type it in? Create your firm manually
          </Text>
        </TouchableOpacity>
      )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  welcomeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#065F46',
  },
  welcomeText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#047857',
    marginTop: 3,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  manualText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  stepsBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 7,
  },
  stepNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  stepsNote: {
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 4,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  scanBtnTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  scanBtnSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  pairedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 12,
  },
  pairedText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 15,
  },
  cantScanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 4,
  },
  cantScanText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  lastSyncRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    gap: 12,
  },
  lastSyncLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  lastSyncVal: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  connBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  connBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});

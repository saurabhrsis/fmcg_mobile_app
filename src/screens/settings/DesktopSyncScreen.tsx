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

export const DesktopSyncScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { refreshBusinesses } = useBusiness();

  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [lastPushAt, setLastPushAt] = useState('');
  const [lastPullAt, setLastPullAt] = useState('');
  const [busy, setBusy] = useState<Busy>('');
  const [connStatus, setConnStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      const cfg = await syncService.getConfig();
      setUrl(cfg.url);
      setApiKey(cfg.apiKey);
      setLastPushAt(cfg.lastPushAt);
      setLastPullAt(cfg.lastPullAt);
    })();
  }, []);

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

      {/* Hero */}
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

      {/* Network sync */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Wi-Fi / Network Sync</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          Both devices must be on the same network. Find the sync address in the desktop portal under
          Settings → Mobile Sync (e.g. http://192.168.1.5:8090).
        </Text>

        <Input
          label="Desktop Portal URL"
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.5:8090"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Input
          label="API Key (optional)"
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Leave blank if the portal has no key set"
          autoCapitalize="none"
        />

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
          sub="Check that the desktop portal is reachable"
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
          'Records are matched by their identity — invoice number, item name & SKU, party name, batch number — not by internal IDs, so both sides can keep billing independently.',
          'Merge never deletes or overwrites your existing entries; it only adds records that are missing on this device ("local wins").',
          'Invoices that already exist here (same number & type) are skipped, so re-syncing never duplicates bills or stock.',
          'Use "Replace All" only when setting up a fresh device from a desktop export.',
        ].map((t, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="information-circle-outline" size={15} color={colors.palette.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{t}</Text>
          </View>
        ))}
      </Card>

      <View style={{ height: 30 }} />
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

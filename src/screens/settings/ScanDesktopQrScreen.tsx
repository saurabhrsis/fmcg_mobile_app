import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { parsePairingCode, syncService } from '../../services/syncService';

/**
 * Scan the pairing QR shown by the RightServe desktop app
 * (Settings → Mobile Sync). The QR carries both the LAN address and the API
 * key, e.g.
 *   {"v":1,"app":"rightserve-sync","url":"http://192.168.1.5:4000","key":"rsync_…"}
 * so the user never types a URL. On a successful scan the config is saved and
 * the connection is tested straight away; a manual paste fallback is provided
 * for devices without a camera (or when the QR is on the same screen).
 */
export const ScanDesktopQrScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const lastError = useRef('');

  /** Save + test a pairing code coming from the camera or the paste box. */
  const connectWith = async (raw: string, source: 'qr' | 'manual') => {
    if (busy || scanned) return;
    let url = '';
    let apiKey = '';
    try {
      const parsed = parsePairingCode(raw);
      url = parsed.url;
      apiKey = parsed.apiKey;
    } catch (e: any) {
      lastError.current = e?.message || 'Could not read that code.';
      if (source === 'manual') {
        Alert.alert('Not a pairing code', lastError.current);
      } else {
        // Let the finder keep scanning — the user may have pointed at any QR.
        Alert.alert(
          'Not a RightServe QR',
          `${lastError.current}\n\nOpen the desktop app → Settings → Mobile Sync and scan the pairing QR shown there.`
        );
      }
      return;
    }

    setScanned(true);
    setBusy(true);
    setManualOpen(false);
    try {
      await syncService.saveConfig(url, apiKey);
      const ping = await syncService.testConnection(url, apiKey);
      Alert.alert(
        ping.ok ? 'Desktop Connected' : 'Saved — Desktop Not Reachable',
        ping.ok
          ? `${ping.message}\n\nNow tap “Full Sync” on the Desktop Sync screen to pull the desktop data and push this phone’s data.`
          : `Pairing details saved (${url}).\n\n${ping.message}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      if (!ping.ok) navigation.goBack();
    } catch (e: any) {
      setScanned(false);
      Alert.alert('Pairing Failed', e?.message || 'Could not save the pairing details.');
    } finally {
      setBusy(false);
    }
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || busy) return;
    connectWith(data, 'qr');
  };

  function renderManualModal() {
    return (
      <Modal visible={manualOpen} transparent animationType="fade" onRequestClose={() => setManualOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Paste Pairing Code</Text>
            <Text style={{ fontSize: 11.5, color: colors.textMuted, marginBottom: 10, lineHeight: 16 }}>
              Shown under the QR in the desktop app (Settings → Mobile Sync). It looks like{' '}
              {'{"v":1,"app":"rightserve-sync","url":"http://192.168.1.5:4000","key":"rsync_…"}'}
            </Text>
            <Input
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Paste the code or the desktop URL"
              autoCapitalize="none"
              multiline
              numberOfLines={4}
              style={{ height: 90, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setManualOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Connect"
                onPress={() => connectWith(manualCode, 'manual')}
                loading={busy}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ---------------- permission states ----------------

  if (!permission) {
    return (
      <ScreenWrapper title="Scan Desktop QR" subtitle="Pair with the desktop app">
        <View style={styles.center}>
          <ActivityIndicator color={colors.palette.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenWrapper title="Scan Desktop QR" subtitle="Pair with the desktop app">
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <View style={[styles.iconCircle, { backgroundColor: colors.palette.primaryLight }]}>
            <Ionicons name="camera-outline" size={34} color={colors.palette.primaryDark} />
          </View>
          <Text style={[styles.deniedTitle, { color: colors.text }]}>Camera access needed</Text>
          <Text style={[styles.deniedText, { color: colors.textSecondary }]}>
            The camera is used only to read the pairing QR on your desktop screen. No photos are
            taken or stored.
          </Text>
          <Button
            title={permission.canAskAgain ? 'Allow Camera' : 'Open Device Settings'}
            icon="camera"
            onPress={async () => {
              if (permission.canAskAgain) {
                await requestPermission();
              } else {
                Alert.alert(
                  'Camera Blocked',
                  'Enable the camera for RightServe FMCG Mobile in your device settings, then reopen this screen. You can also paste the pairing code manually below.'
                );
              }
            }}
            style={{ marginTop: 14, alignSelf: 'stretch' }}
          />
          <Button
            title="Paste pairing code instead"
            variant="secondary"
            icon="copy-outline"
            onPress={() => setManualOpen(true)}
            style={{ marginTop: 10, alignSelf: 'stretch' }}
          />
          {renderManualModal()}
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // ---------------- camera ----------------

  return (
    <ScreenWrapper title="Scan Desktop QR" subtitle="Pair with the desktop app">
      <View style={styles.body}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned || busy ? undefined : onBarcodeScanned}
        />

        {/* Finder overlay */}
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.spacer} />
          <View style={styles.finderRow}>
            <View style={styles.spacer} />
            <View style={[styles.finder, { borderColor: colors.palette.primary }]}>
              <View style={[styles.corner, styles.cornerTL, { borderColor: '#ffffff' }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: '#ffffff' }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: '#ffffff' }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: '#ffffff' }]} />
              {busy ? <ActivityIndicator color="#ffffff" /> : null}
            </View>
            <View style={styles.spacer} />
          </View>
          <View style={styles.spacer} />
        </View>

        {/* Instructions */}
        <View style={[styles.infoBar, { backgroundColor: 'rgba(15,23,42,0.82)' }]}>
          <Text style={styles.infoTitle}>Point at the QR on your desktop screen</Text>
          <Text style={styles.infoText}>
            Desktop app → Settings → Mobile Sync → show pairing QR. Both devices must be on the same
            Wi-Fi network; the QR supplies the address (port 4000) and the API key.
          </Text>
          <View style={styles.infoActions}>
            <TouchableOpacity style={styles.linkBtn} onPress={() => setManualOpen(true)}>
              <Ionicons name="copy-outline" size={15} color="#ffffff" />
              <Text style={styles.linkBtnText}>Can’t scan? Paste code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={16} color="#ffffff" />
              <Text style={styles.linkBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {Platform.OS === 'web' ? (
            <Text style={[styles.infoText, { marginTop: 8, color: '#fcd34d' }]}>
              Camera scanning may not be available in a browser — use “Paste code” with the details
              shown under the desktop QR.
            </Text>
          ) : null}
        </View>
      </View>
      {renderManualModal()}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  body: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  spacer: {
    flex: 1,
  },
  finderRow: {
    flexDirection: 'row',
    height: 250,
  },
  finder: {
    width: 250,
    height: 250,
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  cornerTL: { top: -2, left: -2, borderTopLeftRadius: 16, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: -2, right: -2, borderTopRightRadius: 16, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: -2, left: -2, borderBottomLeftRadius: 16, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: -2, right: -2, borderBottomRightRadius: 16, borderLeftWidth: 0, borderTopWidth: 0 },
  infoBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  infoText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  infoActions: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 12,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deniedTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
  },
  deniedText: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { backupService } from '../../services/backupService';
import { migrateService } from '../../services/migrateService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'backup' | 'import';

/**
 * One place for everything data-safety related:
 *  • Backup & Restore (JSON export / restore / wipe)
 *  • CSV Import (products & parties from Marg, Vyapar, Tally, Excel)
 * The two old separate screens were merged to keep the app simple.
 */
export const DataManagementScreen: React.FC = () => {
  const { colors } = useTheme();
  const { activeBusiness, refreshBusinesses } = useBusiness();

  const [tab, setTab] = useState<Tab>('backup');

  // ---- Backup & Restore state ----
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loadingWipe, setLoadingWipe] = useState(false);

  // ---- CSV import state ----
  const [entity, setEntity] = useState<'items' | 'parties'>('items');
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ---------------- Backup & Restore ----------------

  const handleExportBackup = async () => {
    setLoadingExport(true);
    try {
      const jsonStr = await backupService.exportBackup();
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileUri = `${FileSystem.documentDirectory}RightServe_Backup_${dateStr}.json`;

      await FileSystem.writeAsStringAsync(fileUri, jsonStr);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export SQLite Database Backup',
        });
      } else {
        Alert.alert('Backup Generated', 'Backup file saved to app storage');
      }
    } catch (e: any) {
      Alert.alert('Export Error', e.message);
    } finally {
      setLoadingExport(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const file = res.assets[0];
      setLoadingRestore(true);

      const content = await FileSystem.readAsStringAsync(file.uri);
      const result = await backupService.restoreBackup(content);

      if (result.success) {
        await refreshBusinesses();
        Alert.alert('Restore Complete', 'Database restored successfully!');
      } else {
        Alert.alert('Restore Error', result.error || 'Failed to restore backup');
      }
    } catch (e: any) {
      Alert.alert('Restore Error', e.message);
    } finally {
      setLoadingRestore(false);
    }
  };

  const handleWipeData = async () => {
    if (!adminPassword.trim()) {
      Alert.alert('Password Required', 'Enter master admin password to wipe database');
      return;
    }

    Alert.alert(
      'DANGER: Wipe All Data',
      'This will permanently delete all transactions, items, parties and batches. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Everything',
          style: 'destructive',
          onPress: async () => {
            setLoadingWipe(true);
            const res = await backupService.wipeAllData(adminPassword);
            setLoadingWipe(false);
            if (res.success) {
              await refreshBusinesses();
              Alert.alert('Reset Complete', 'All transaction & master data wiped.');
              setAdminPassword('');
            } else {
              Alert.alert('Reset Failed', res.error);
            }
          },
        },
      ]
    );
  };

  // ---------------- CSV Import ----------------

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const file = res.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      setCsvText(content);
      const prev = migrateService.previewCsv(content, entity);
      setPreview(prev);
    } catch (e: any) {
      Alert.alert('File Error', e.message);
    }
  };

  const handlePreviewText = () => {
    if (!csvText.trim()) {
      Alert.alert('Input Error', 'Please paste CSV content or select a file');
      return;
    }
    const prev = migrateService.previewCsv(csvText, entity);
    setPreview(prev);
  };

  const handleCommit = async () => {
    if (!activeBusiness || !csvText.trim()) return;
    setLoading(true);
    try {
      const res = await migrateService.commitImport(activeBusiness.id, csvText, entity);
      Alert.alert(
        'Import Successful',
        `Successfully imported ${res.inserted} ${entity}!${res.errors.length > 0 ? ` (${res.errors.length} skipped)` : ''}`
      );
      setPreview(null);
      setCsvText('');
    } catch (e: any) {
      Alert.alert('Import Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShareSample = async () => {
    try {
      const sample =
        entity === 'items'
          ? migrateService.getItemSampleCsv()
          : migrateService.getPartySampleCsv();
      const fileUri = `${FileSystem.documentDirectory}Sample_${entity}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, sample);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Sample ${entity} CSV Template`,
        });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // ---------------- UI ----------------

  const tabs: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'backup', label: 'Backup & Restore', icon: 'shield-checkmark-outline' },
    { key: 'import', label: 'CSV Import', icon: 'cloud-upload-outline' },
  ];

  return (
    <ScreenWrapper title="Data Backup & Import" subtitle="Backups, restore & CSV migration">
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Segmented tabs */}
        <View style={[styles.tabBar, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tabChip,
                  { backgroundColor: active ? colors.palette.primary : 'transparent' },
                ]}
                onPress={() => setTab(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={active ? '#FFF' : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: active ? '#FFF' : colors.textSecondary,
                    fontSize: 12.5,
                    fontWeight: '700',
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'backup' ? (
          <>
            {/* Export Card */}
            <Card>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: colors.palette.primaryLight }]}>
                  <Ionicons name="cloud-download-outline" size={24} color={colors.palette.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Export Complete Backup</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Saves all invoices, inventory, serials, parties & firms as a portable JSON file
                  </Text>
                </View>
              </View>
              <Button
                title="Generate & Share Backup"
                icon="share-outline"
                onPress={handleExportBackup}
                loading={loadingExport}
                style={{ marginTop: 12 }}
              />
            </Card>

            {/* Restore Card */}
            <Card>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="cloud-upload-outline" size={24} color="#b45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Restore from Backup</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Select a previous backup JSON file to restore all tables
                  </Text>
                </View>
              </View>
              <Button
                title="Select Backup File"
                icon="folder-open-outline"
                variant="secondary"
                onPress={handleRestoreBackup}
                loading={loadingRestore}
                style={{ marginTop: 12 }}
              />
            </Card>

            {/* Data Reset / Wipe */}
            <Card style={{ borderColor: '#fca5a5' }}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#ffe4e6' }]}>
                  <Ionicons name="warning-outline" size={24} color="#be123c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: '#be123c' }]}>Wipe / Reset All Data</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Clears all sales, purchases, items and parties while keeping user accounts
                  </Text>
                </View>
              </View>

              <Input
                label="Enter Master Admin Password to Confirm"
                value={adminPassword}
                onChangeText={setAdminPassword}
                placeholder="Master password"
                secureTextEntry
                containerStyle={{ marginTop: 10 }}
              />

              <Button
                title="Wipe All Data"
                icon="trash-outline"
                variant="danger"
                onPress={handleWipeData}
                loading={loadingWipe}
                style={{ marginTop: 4 }}
              />
            </Card>
          </>
        ) : (
          <>
            <Card>
              <Select
                label="Import Data Type"
                value={entity}
                onChange={(val) => {
                  setEntity(val);
                  setPreview(null);
                }}
                options={[
                  { label: 'Products & Opening Inventory (Items)', value: 'items' },
                  { label: 'Customers & Suppliers Directory (Parties)', value: 'parties' },
                ]}
              />

              <View style={styles.actionRow}>
                <Button
                  title="Select CSV File"
                  icon="document-attach-outline"
                  onPress={handlePickFile}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Get Sample CSV"
                  variant="secondary"
                  icon="download-outline"
                  onPress={handleShareSample}
                />
              </View>

              <Input
                label="Or Paste CSV Content Directly"
                value={csvText}
                onChangeText={setCsvText}
                placeholder="Paste raw comma-separated text..."
                multiline
                numberOfLines={4}
                containerStyle={{ marginTop: 12 }}
              />

              {!preview && csvText.length > 0 && (
                <Button
                  title="Analyze & Preview CSV"
                  variant="outline"
                  onPress={handlePreviewText}
                />
              )}
            </Card>

            {/* Preview Card */}
            {preview && (
              <Card>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Detected {preview.totalRows} Rows
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>
                  Columns auto-mapped from headers:
                </Text>

                <View style={[styles.mappingBox, { backgroundColor: colors.surfaceSubtle }]}>
                  {Object.entries(preview.mapping).map(([field, col]: any, idx) => (
                    <View key={idx} style={styles.mapItem}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.palette.primary }}>
                        {field}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.text }}>← "{col}"</Text>
                    </View>
                  ))}
                </View>

                <Button
                  title={`Import ${preview.totalRows} ${entity.toUpperCase()}`}
                  onPress={handleCommit}
                  loading={loading}
                  size="lg"
                  style={{ marginTop: 12 }}
                />
              </Card>
            )}
          </>
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
  tabBar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  tabChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  mappingBox: {
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  mapItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { backupService } from '../../services/backupService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Ionicons } from '@expo/vector-icons';

export const BackupRestoreScreen: React.FC = () => {
  const { colors } = useTheme();
  const { refreshBusinesses } = useBusiness();

  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loadingWipe, setLoadingWipe] = useState(false);

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

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Data Safety & Backup</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Offline-first SQLite database management & migration
        </Text>

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
                Select a previous RightServe backup JSON file to restore all tables
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
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
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
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { migrateService } from '../../services/migrateService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Ionicons } from '@expo/vector-icons';

export const DataImportScreen: React.FC = () => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [entity, setEntity] = useState<'items' | 'parties'>('items');
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>CSV Data Migration</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Import product master lists & customer records from Marg, Vyapar, Tally or Excel
        </Text>

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

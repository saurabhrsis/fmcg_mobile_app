import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface ImagePickerFieldProps {
  label: string;
  hint?: string;
  value: string; // data URI or ''
  onChange: (dataUri: string) => void;
}

/**
 * Small image upload tile — picks a PNG/JPG from the device, converts it to a
 * base64 data URI (kept small so it fits in SQLite) and previews it.
 * Used for the bill branding images: logo, signature, stamp/seal, payment QR.
 */
export const ImagePickerField: React.FC<ImagePickerFieldProps> = ({
  label,
  hint,
  value,
  onChange,
}) => {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];

      // Keep the DB small — refuse anything above ~1.5 MB.
      if (asset.size && asset.size > 1.5 * 1024 * 1024) {
        Alert.alert('Image too large', 'Please choose an image under 1.5 MB (a small PNG/JPG works best on bills).');
        return;
      }

      setBusy(true);
      const b64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mime = asset.mimeType || 'image/png';
      onChange(`data:${mime};base64,${b64}`);
    } catch (e: any) {
      Alert.alert('Could not load image', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={pick}
        style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}
      >
        {busy ? (
          <ActivityIndicator color={colors.palette.primary} />
        ) : value ? (
          <Image source={{ uri: value }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={22} color={colors.textMuted} />
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>Tap to upload</Text>
          </View>
        )}
      </TouchableOpacity>

      {value ? (
        <TouchableOpacity onPress={() => onChange('')} style={styles.removeBtn}>
          <Ionicons name="close-circle" size={14} color={colors.palette.danger} />
          <Text style={[styles.removeText, { color: colors.palette.danger }]}>Remove</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: '45%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  hint: {
    fontSize: 10,
    marginTop: 1,
    marginBottom: 4,
  },
  box: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 2,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    gap: 2,
  },
  placeholderText: {
    fontSize: 10,
    fontWeight: '600',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  removeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

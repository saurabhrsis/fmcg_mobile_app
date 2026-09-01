import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { UserPermissions } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Ionicons } from '@expo/vector-icons';

export const UserFormScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const editId = route.params?.id;

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(true);

  const [permissions, setPermissions] = useState<UserPermissions>({
    sales: true,
    purchases: true,
    inventory: true,
    parties: true,
    payments: true,
    reports: false,
    eway: false,
    settings: false,
    migrate: false,
    delete_tx: false,
    edit_price: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editId) {
      (async () => {
        const u = await authService.getUserById(editId);
        if (u) {
          setName(u.name);
          setUsername(u.username);
          setActive(u.active);
          if (u.permissions) {
            setPermissions(u.permissions);
          }
        }
      })();
    }
  }, [editId]);

  const togglePerm = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      if (editId) {
        await authService.updateUser(editId, {
          name,
          permissions,
          active,
        });
        if (password.trim().length >= 4) {
          await authService.changePassword(editId, password.trim());
        }
      } else {
        if (!username.trim() || !password.trim()) {
          Alert.alert('Validation Error', 'Username and Password are required');
          setLoading(false);
          return;
        }
        await authService.createUser({
          name,
          username,
          password,
          role: 'staff',
          permissions,
          createdBy: currentUser?.id,
        });
      }

      Alert.alert('Success', `Staff user "${name}" saved!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const permItems: Array<{ key: keyof UserPermissions; label: string; desc: string }> = [
    { key: 'sales', label: 'Create & View Sales', desc: 'Can generate sale invoices & bills' },
    { key: 'purchases', label: 'Create & View Purchases', desc: 'Can record vendor purchase bills' },
    { key: 'inventory', label: 'View & Manage Stock', desc: 'Can add items, edit batches & view stock' },
    { key: 'parties', label: 'Manage Customers & Suppliers', desc: 'Can create parties & view ledger statements' },
    { key: 'payments', label: 'Receipts & Payments', desc: 'Can record money received & payments made' },
    { key: 'reports', label: 'Financial & GST Reports', desc: 'Can access GSTR-1, P&L, sales register' },
    { key: 'eway', label: 'E-Way Bills', desc: 'Can generate transport e-way slips' },
    { key: 'edit_price', label: 'Edit Unit Selling Price', desc: 'Can override default prices on billing' },
    { key: 'delete_tx', label: 'Delete Invoices / Payments', desc: 'Can cancel or remove recorded vouchers' },
    { key: 'settings', label: 'Company Settings', desc: 'Can modify business profiles & configurations' },
    { key: 'migrate', label: 'Data Import / Backup', desc: 'Can import CSVs and restore backups' },
  ];

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          {editId ? 'Edit Staff User & Permissions' : 'Create Staff Operator'}
        </Text>

        <Card>
          <Input label="Full Name *" value={name} onChangeText={setName} placeholder="e.g. Sales Operator 1" />
          <Input
            label="Username *"
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. biller1"
            autoCapitalize="none"
            editable={!editId}
          />
          <Input
            label={editId ? 'Change Password (leave empty to keep current)' : 'Password *'}
            value={password}
            onChangeText={setPassword}
            placeholder="Min 4 characters"
            secureTextEntry
          />

          {editId && (
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setActive(!active)}
            >
              <Text style={[styles.toggleText, { color: colors.text }]}>Account Active Status</Text>
              <Ionicons
                name={active ? 'checkbox' : 'square-outline'}
                size={24}
                color={colors.palette.primary}
              />
            </TouchableOpacity>
          )}
        </Card>

        {/* Granular Permissions Card */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Granular Module Permissions</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
            Control which screens & operations this operator can access
          </Text>

          {permItems.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.permRow, { borderBottomColor: colors.border }]}
              onPress={() => togglePerm(p.key)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.permLabel, { color: colors.text }]}>{p.label}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{p.desc}</Text>
              </View>
              <Ionicons
                name={permissions[p.key] ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={permissions[p.key] ? colors.palette.primary : colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </Card>

        <Button
          title={editId ? 'Save Changes' : 'Create Staff User'}
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: 8 }}
        />
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
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  permLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});

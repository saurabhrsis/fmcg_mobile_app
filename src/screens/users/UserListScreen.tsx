import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { User } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const UserListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);

  const loadUsers = async () => {
    try {
      const list = await authService.getAllUsers();
      setUsers(list);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const handleDeleteUser = (u: User) => {
    if (u.role === 'admin') {
      Alert.alert('Protected', 'Cannot delete the master admin account');
      return;
    }
    Alert.alert('Delete User', `Are you sure you want to delete staff user "${u.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await authService.deleteUser(u.id);
          await loadUsers();
        },
      },
    ]);
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Users & Access Control</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              Manage billing operators & staff permissions
            </Text>
          </View>
          {currentUser?.role === 'admin' && (
            <Button
              title="+ Add Staff"
              size="sm"
              onPress={() => navigation.navigate('UserForm')}
            />
          )}
        </View>

        <FlatList
          data={users}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Card style={styles.userCard}>
              <View style={styles.userTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    Username: @{item.username}
                  </Text>
                </View>
                <View style={{ gap: 4, alignItems: 'flex-end' }}>
                  <Badge
                    label={item.role.toUpperCase()}
                    variant={item.role === 'admin' ? 'primary' : 'info'}
                  />
                  <Badge
                    label={item.active ? 'Active' : 'Disabled'}
                    variant={item.active ? 'success' : 'danger'}
                  />
                </View>
              </View>

              {item.role !== 'admin' && currentUser?.role === 'admin' && (
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('UserForm', { id: item.id })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="key-outline" size={14} color={colors.palette.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.palette.primary }}>
                      Permissions / Password
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleDeleteUser(item)}>
                    <Ionicons name="trash-outline" size={18} color={colors.palette.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          )}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  userCard: {
    padding: 14,
    marginBottom: 10,
  },
  userTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
});

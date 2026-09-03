import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { itemService } from '../../services/itemService';
import { Category } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Ionicons } from '@expo/vector-icons';

export const CategoryManagerScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCategories = async () => {
    try {
      const list = await itemService.getAllCategories();
      setCategories(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingCat(null);
    setName('');
    setParentId(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setParentId(cat.parent_id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    setLoading(true);
    try {
      if (editingCat) {
        await itemService.updateCategory(editingCat.id, name, parentId);
      } else {
        await itemService.createCategory(name, parentId);
      }
      setModalVisible(false);
      await loadCategories();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('Delete Category', `Are you sure you want to delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await itemService.deleteCategory(cat.id);
          await loadCategories();
        },
      },
    ]);
  };

  return (
    <ScreenWrapper title="Category Hierarchy" subtitle="Product category tree">
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.title, { color: colors.text }]}>Categories</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              Multi-level tree structure for products
            </Text>
          </View>
          <Button title="+ Add Category" size="sm" onPress={handleOpenAdd} />
        </View>

        <FlatList
          data={categories}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="folder-open-outline"
              title="No Categories"
              description="Create hierarchical categories like Beverages > Soft Drinks"
              actionTitle="Create First Category"
              onAction={handleOpenAdd}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.catCard}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.catName, { color: colors.text }]}>{item.path || item.name}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {item.parent_id ? `Sub-category of ID: ${item.parent_id}` : 'Top-Level Category'}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleOpenEdit(item)} style={{ padding: 6 }}>
                  <Ionicons name="pencil" size={18} color={colors.palette.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 6 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.palette.danger} />
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />

        {/* Add/Edit Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setModalVisible(false)}
              />
              <View
                style={[
                  styles.modalBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    paddingBottom: Math.max(insets.bottom, 16) + 16,
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {editingCat ? 'Edit Category' : 'Create Category'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Input
                    label="Category Name *"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Soft Drinks, Dairy, Snacks"
                    autoFocus
                  />

                  <Select
                    label="Parent Category (Optional)"
                    value={parentId}
                    onChange={setParentId}
                    options={[
                      { label: 'None (Top Level)', value: null },
                      ...categories
                        .filter((c) => !editingCat || c.id !== editingCat.id)
                        .map((c) => ({ label: c.path || c.name, value: c.id })),
                    ]}
                  />

                  <Button
                    title={editingCat ? 'Save Changes' : 'Create Category'}
                    onPress={handleSave}
                    loading={loading}
                    style={{ marginTop: 12 }}
                  />
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  catCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
});

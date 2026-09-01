import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { itemService } from '../../services/itemService';
import { Item, Category } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export const ItemListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!activeBusiness) return;
    try {
      const [itemList, catList] = await Promise.all([
        itemService.getAllItems(activeBusiness.id, search, selectedCatId),
        itemService.getAllCategories(),
      ]);
      setItems(itemList);
      setCategories(catList);
    } catch (e) {
      console.error('Failed to load items:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeBusiness, search, selectedCatId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Top Shortcuts Bar */}
        <View style={styles.topShortcuts}>
          <TouchableOpacity
            style={[styles.shortcutBtn, { backgroundColor: colors.palette.primaryLight }]}
            onPress={() => navigation.navigate('BatchStock')}
          >
            <Ionicons name="time" size={16} color={colors.palette.primaryDark} />
            <Text style={[styles.shortcutText, { color: colors.palette.primaryDark }]}>Batches & Expiry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shortcutBtn, { backgroundColor: colors.surfaceSubtle }]}
            onPress={() => navigation.navigate('SerialLookup')}
          >
            <Ionicons name="barcode-outline" size={16} color={colors.text} />
            <Text style={[styles.shortcutText, { color: colors.text }]}>Serial Registry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shortcutBtn, { backgroundColor: colors.surfaceSubtle }]}
            onPress={() => navigation.navigate('CategoryManager')}
          >
            <Ionicons name="folder-outline" size={16} color={colors.text} />
            <Text style={[styles.shortcutText, { color: colors.text }]}>Categories</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Add Bar */}
        <View style={styles.searchRow}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search products by name, SKU, HSN..."
            style={{ flex: 1, marginBottom: 0 }}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.palette.primary }]}
            onPress={() => navigation.navigate('ItemForm')}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Category Horizontal Filter Chips */}
        {categories.length > 0 && (
          <View style={styles.catChipsContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[{ id: null, name: 'All Categories' } as any, ...categories]}
              keyExtractor={(c) => String(c.id)}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.catChip,
                    {
                      backgroundColor:
                        selectedCatId === item.id ? colors.palette.primary : colors.surfaceSubtle,
                    },
                  ]}
                  onPress={() => setSelectedCatId(item.id)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      { color: selectedCatId === item.id ? '#ffffff' : colors.text },
                    ]}
                  >
                    {item.path || item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Items List */}
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.palette.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title="No Products Found"
              description="Tap the + button above to create a new item"
              actionTitle="Add New Item"
              onAction={() => navigation.navigate('ItemForm')}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.itemCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
            >
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemSku, { color: colors.textMuted }]}>
                    SKU: {item.sku || 'N/A'} {item.category_name ? `• ${item.category_name}` : ''}
                  </Text>
                </View>
                <Badge
                  label={item.stock && item.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  variant={item.stock && item.stock > 0 ? 'success' : 'danger'}
                />
              </View>

              {/* Multi-unit packaging stock display */}
              <View style={[styles.stockBox, { backgroundColor: colors.surfaceSubtle }]}>
                <View>
                  <Text style={[styles.stockLabel, { color: colors.textMuted }]}>Current Stock</Text>
                  <Text style={[styles.stockVal, { color: colors.palette.primary }]}>
                    {item.stock_label || `${item.stock || 0} ${item.unit}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.stockLabel, { color: colors.textMuted }]}>Sale Price / Base</Text>
                  <Text style={[styles.priceVal, { color: colors.text }]}>
                    {formatCurrency(item.sale_price)}
                  </Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  HSN: {item.hsn || '-'} • GST: {item.gst_rate}%
                </Text>
                {item.track_serials ? (
                  <Badge label="Serial Tracked" variant="info" />
                ) : null}
              </View>
            </TouchableOpacity>
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
  topShortcuts: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChipsContainer: {
    paddingVertical: 8,
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemSku: {
    fontSize: 11,
    marginTop: 2,
  },
  stockBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  stockLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  stockVal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  priceVal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
});

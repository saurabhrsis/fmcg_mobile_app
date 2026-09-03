import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';

export const BusinessListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { businesses, activeBusiness, switchBusiness } = useBusiness();

  return (
    <ScreenWrapper title="Registered Businesses" subtitle="Manage your firms & billing formats">
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.title, { color: colors.text }]}>Businesses (Firms)</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              Manage multiple company profiles & billing formats
            </Text>
          </View>
          <Button
            title="+ Add Firm"
            size="sm"
            onPress={() => navigation.navigate('BusinessForm')}
          />
        </View>

        <FlatList
          data={businesses}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isActive = item.id === activeBusiness?.id;

            return (
              <Card
                style={[
                  styles.bizCard,
                  {
                    borderColor: isActive ? colors.palette.primary : colors.border,
                    borderWidth: isActive ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bizName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {item.phone || 'No phone'} • {item.state || 'India'}
                    </Text>
                    {item.gstin ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        GSTIN: {item.gstin}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ gap: 4, alignItems: 'flex-end' }}>
                    {isActive ? (
                      <Badge label="Active Firm" variant="success" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => switchBusiness(item.id)}
                        style={[styles.switchBtn, { backgroundColor: colors.palette.primaryLight }]}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.palette.primaryDark }}>
                          Switch To
                        </Text>
                      </TouchableOpacity>
                    )}
                    {item.is_default === 1 && (
                      <Badge label="Default" variant="primary" />
                    )}
                  </View>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Bill Format: <Text style={{ fontWeight: '600' }}>{item.bill_format.toUpperCase()}</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('BusinessForm', { id: item.id })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="settings-outline" size={14} color={colors.palette.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.palette.primary }}>
                      Customize
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
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
  bizCard: {
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bizName: {
    fontSize: 16,
    fontWeight: '800',
  },
  switchBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
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

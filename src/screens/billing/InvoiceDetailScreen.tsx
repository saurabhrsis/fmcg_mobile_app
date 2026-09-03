import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { invoiceService } from '../../services/invoiceService';
import { printService } from '../../services/printService';
import { whatsappService } from '../../services/whatsappService';
import { Invoice } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const InvoiceDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();
  const invoiceId = route.params?.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInvoice = async () => {
    try {
      const data = await invoiceService.getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (e) {
      console.error('Failed to load invoice:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  if (!invoice && !loading) {
    return (
      <ScreenWrapper title="Voucher Details">
        <View style={styles.center}>
          <Text style={{ color: colors.text }}>Invoice not found</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const handlePrint = async () => {
    if (!activeBusiness || !invoice) return;
    try {
      await printService.printInvoice(activeBusiness, invoice);
    } catch (e: any) {
      Alert.alert('Print Error', e.message);
    }
  };

  const handleSharePdf = async () => {
    if (!activeBusiness || !invoice) return;
    try {
      await printService.shareInvoicePdf(activeBusiness, invoice);
    } catch (e: any) {
      Alert.alert('Share Error', e.message);
    }
  };

  const handleWhatsApp = async () => {
    if (!activeBusiness || !invoice) return;
    const msg = whatsappService.buildInvoiceMessage(activeBusiness, invoice);
    const ok = await whatsappService.sendWhatsApp(invoice.party_phone || '', msg);
    if (!ok) {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp on this device');
    }
  };

  const handleConvertToSale = async () => {
    if (!invoice) return;
    try {
      const sale = await invoiceService.convertQuotationToSale(invoice.id);
      Alert.alert('Converted', `Successfully converted to Sales Invoice ${sale.invoice_no}!`, [
        { text: 'View Sale', onPress: () => navigation.replace('InvoiceDetail', { id: sale.id }) },
      ]);
    } catch (e: any) {
      Alert.alert('Conversion Failed', e.message);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Voucher',
      `Are you sure you want to delete ${invoice?.invoice_no}? This will restore stock & remove linked payments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (invoice) {
              await invoiceService.deleteInvoice(invoice.id);
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper
      title={invoice?.invoice_no || 'Voucher Details'}
      subtitle={invoice ? `${(invoice.type || 'sale').toUpperCase()} • ${formatDate(invoice.date)}` : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Card */}
        <Card>
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.invoiceTitle, { color: colors.palette.primary }]}>
                {invoice?.invoice_no}
              </Text>
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                Dated: {formatDate(invoice?.date)}
              </Text>
            </View>
            <Badge label={invoice?.status || 'unpaid'} variant={invoice?.status === 'paid' ? 'success' : 'warning'} />
          </View>

          <View style={[styles.partyBox, { borderTopColor: colors.border }]}>
            <Text style={[styles.partyHeading, { color: colors.textMuted }]}>
              {invoice?.type === 'purchase' ? 'Supplier / Vendor' : 'Customer / Buyer'}
            </Text>
            <Text style={[styles.partyName, { color: colors.text }]}>
              {invoice?.party_name || 'Cash Customer'}
            </Text>
            {invoice?.party_address ? (
              <Text style={[styles.partySub, { color: colors.textMuted }]}>{invoice.party_address}</Text>
            ) : null}
            {invoice?.party_phone ? (
              <Text style={[styles.partySub, { color: colors.textMuted }]}>Phone: {invoice.party_phone}</Text>
            ) : null}
            {invoice?.party_gstin ? (
              <Text style={[styles.partySub, { color: colors.textMuted }]}>GSTIN: {invoice.party_gstin}</Text>
            ) : null}
          </View>
        </Card>

        {/* Action Buttons Row */}
        <View style={styles.actionGrid}>
          <Button
            title="Print"
            icon="print"
            onPress={handlePrint}
            style={{ flex: 1 }}
          />
          <Button
            title="PDF"
            icon="share-outline"
            variant="secondary"
            onPress={handleSharePdf}
            style={{ flex: 1 }}
          />
          <Button
            title="WhatsApp"
            icon="logo-whatsapp"
            variant="success"
            onPress={handleWhatsApp}
            style={{ flex: 1 }}
          />
        </View>

        {/* Convert Quotation Action */}
        {invoice?.type === 'quotation' && invoice.status !== 'converted' && (
          <Button
            title="Convert to Sales Invoice"
            icon="checkmark-done"
            variant="primary"
            onPress={handleConvertToSale}
            style={{ marginBottom: 12 }}
          />
        )}

        {/* Itemized Table Card */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Billed Items</Text>
          {(invoice?.items || []).map((it, idx) => (
            <View
              key={idx}
              style={[
                styles.itemRow,
                { borderBottomColor: idx === (invoice?.items?.length || 0) - 1 ? 'transparent' : colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.text }]}>{it.item_name}</Text>
                <Text style={[styles.itemSub, { color: colors.textMuted }]}>
                  {it.qty} {it.unit || 'PCS'} × {formatCurrency(it.price)} | GST: {it.gst_rate}%
                  {it.batch_no ? ` | Batch: ${it.batch_no}` : ''}
                </Text>
                {it.serials ? (
                  <Text style={[styles.itemSerials, { color: colors.textMuted }]}>S/N: {it.serials}</Text>
                ) : null}
              </View>
              <Text style={[styles.itemTotal, { color: colors.text }]}>
                {formatCurrency(it.line_total)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Financial Breakdown Card */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Payment & Tax Breakdown</Text>
          <View style={styles.calcRow}>
            <Text style={{ color: colors.textMuted }}>Taxable Subtotal:</Text>
            <Text style={{ fontWeight: '600', color: colors.text }}>{formatCurrency(invoice?.subtotal)}</Text>
          </View>

          {invoice?.discount ? (
            <View style={styles.calcRow}>
              <Text style={{ color: colors.palette.danger }}>Extra Discount:</Text>
              <Text style={{ fontWeight: '600', color: colors.palette.danger }}>
                -{formatCurrency(invoice.discount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.calcRow}>
            <Text style={{ color: colors.textMuted }}>Total GST Tax:</Text>
            <Text style={{ fontWeight: '600', color: colors.text }}>{formatCurrency(invoice?.tax_total)}</Text>
          </View>

          <View style={[styles.calcRow, styles.grandTotalBorder, { borderTopColor: colors.palette.primary }]}>
            <Text style={[styles.grandLabel, { color: colors.palette.primary }]}>Grand Total:</Text>
            <Text style={[styles.grandVal, { color: colors.palette.primary }]}>{formatCurrency(invoice?.total)}</Text>
          </View>

          <View style={[styles.calcRow, { marginTop: 8 }]}>
            <Text style={{ color: colors.textMuted }}>Amount Paid:</Text>
            <Text style={{ fontWeight: '700', color: colors.palette.success }}>{formatCurrency(invoice?.paid)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={{ color: colors.textMuted }}>Balance Due:</Text>
            <Text style={{ fontWeight: '800', color: colors.palette.danger }}>
              {formatCurrency(Math.max(0, (invoice?.total || 0) - (invoice?.paid || 0)))}
            </Text>
          </View>
        </Card>

        {/* Danger Zone: Delete */}
        <Button
          title="Delete Voucher"
          variant="danger"
          icon="trash-outline"
          onPress={handleDelete}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  partyBox: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  partyHeading: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  partySub: {
    fontSize: 12,
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  itemSerials: {
    fontSize: 10,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  grandTotalBorder: {
    borderTopWidth: 2,
    paddingTop: 8,
    marginTop: 6,
  },
  grandLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  grandVal: {
    fontSize: 18,
    fontWeight: '800',
  },
});

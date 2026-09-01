import { Linking } from 'react-native';
import { Invoice, Payment, Party, Business } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export const whatsappService = {
  buildInvoiceMessage(biz: Business, inv: Invoice): string {
    const lines = inv.items || [];
    const itemSummary = lines
      .map((l) => `• ${l.item_name} × ${l.qty} ${l.unit || ''} = ${formatCurrency(l.line_total)}`)
      .join('\n');

    return `*${biz.name}*
${biz.address}
Phone: ${biz.phone}
${biz.gstin ? `GSTIN: ${biz.gstin}\n` : ''}
----------------------------------------
*${inv.type === 'quotation' ? 'QUOTATION' : inv.note_kind ? (inv.note_kind.toUpperCase() + ' NOTE') : 'TAX INVOICE'}*
Bill No: *${inv.invoice_no}*
Date: ${formatDate(inv.date)}
Customer: *${inv.party_name || 'Cash Customer'}*

*Items:*
${itemSummary}

----------------------------------------
Subtotal: ${formatCurrency(inv.subtotal)}
${inv.discount ? `Discount: -${formatCurrency(inv.discount)}\n` : ''}Tax (GST): ${formatCurrency(inv.tax_total)}
*Grand Total: ${formatCurrency(inv.total)}*
Paid: ${formatCurrency(inv.paid)}
*Balance Due: ${formatCurrency(Math.max(0, inv.total - inv.paid))}*

${biz.bank_name ? `*Bank Details:* ${biz.bank_name} | A/C: ${biz.bank_account} | IFSC: ${biz.bank_ifsc}\n` : ''}${biz.upi_id ? `*UPI ID:* ${biz.upi_id}\n` : ''}
${inv.notes ? `Note: ${inv.notes}\n` : ''}${biz.terms || 'Thank you for your business!'}`;
  },

  buildPaymentReceiptMessage(biz: Business, pay: Payment, partyName: string, partyBalance: number): string {
    return `*PAYMENT RECEIPT*
*${biz.name}*

Received with thanks from: *${partyName}*
Receipt No: *REC-${pay.id}*
Amount Received: *${formatCurrency(pay.amount)}*
Payment Mode: *${pay.mode.toUpperCase()}*
Date: ${formatDate(pay.date)}
${pay.invoice_no ? `Against Invoice: ${pay.invoice_no}\n` : ''}
*Current Outstanding Balance: ${formatCurrency(partyBalance)}*

Thank you!`;
  },

  buildOutstandingReminderMessage(biz: Business, party: Party): string {
    return `*PAYMENT REMINDER*
Dear *${party.name}*,

This is a gentle reminder regarding your outstanding balance of *${formatCurrency(party.balance || 0)}* with *${biz.name}*.

${biz.upi_id ? `*UPI ID:* ${biz.upi_id}\n` : ''}${biz.bank_name ? `*Bank Details:* ${biz.bank_name} | A/C: ${biz.bank_account} | IFSC: ${biz.bank_ifsc}\n` : ''}
Please let us know once the payment is made.

Thank you!
*${biz.name}* (${biz.phone})`;
  },

  async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    let cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone; // India country code default
    }

    const encoded = encodeURIComponent(message);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        await Linking.openURL(`https://wa.me/?text=${encoded}`);
        return true;
      }
    } catch (e) {
      console.warn('Cannot open WhatsApp URL:', e);
      return false;
    }
  },
};

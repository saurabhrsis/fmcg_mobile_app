import { queryAll } from '../db/database';
import { settingsService } from './settingsService';
import { simpleHash } from '../utils/hash';

export interface AppNotification {
  key: string; // stable identity — used for the read-state signature
  kind: 'low_stock' | 'expired' | 'expiring' | 'overdue';
  title: string;
  sub: string;
  /** Screen in the AppStack to open when tapped. */
  screen: string;
  params?: any;
}

/**
 * Fully-offline notification centre. Alerts are derived live from the local
 * SQLite data (low stock, expiring/expired batches, overdue invoices) and the
 * "read" state is a signature of the current alert set persisted in the local
 * settings — no network involved anywhere.
 *
 * When the user opens the notifications screen, the current signature is
 * saved; the bell dot only re-appears when the alert set CHANGES (new alert
 * arrives or an existing one changes state).
 */
export const notificationService = {
  async getNotifications(businessId: number): Promise<AppNotification[]> {
    const notifications: AppNotification[] = [];
    const today = new Date().toISOString().slice(0, 10);

    // 1. Low stock items
    const lowStock = await queryAll<any>(
      `SELECT i.id, i.name, i.unit, i.low_stock_alert,
        COALESCE((SELECT SUM(qty_available) FROM batches b WHERE b.item_id = i.id AND b.business_id = ?), 0) AS stock
       FROM items i
       WHERE i.is_active = 1 AND i.low_stock_alert > 0
         AND COALESCE((SELECT SUM(qty_available) FROM batches b WHERE b.item_id = i.id AND b.business_id = ?), 0) <= i.low_stock_alert
       ORDER BY stock ASC`,
      [businessId, businessId]
    );
    lowStock.forEach((it) => {
      notifications.push({
        key: `low:${it.id}:${it.stock}`,
        kind: 'low_stock',
        title: `Low stock — ${it.name}`,
        sub: `Only ${it.stock} ${it.unit || 'PCS'} left (alert level: ${it.low_stock_alert})`,
        screen: 'ItemDetail',
        params: { id: it.id },
      });
    });

    // 2. Expired & expiring-soon batches (30 days)
    const future30 = new Date();
    future30.setDate(future30.getDate() + 30);
    const future30Str = future30.toISOString().slice(0, 10);

    const expBatches = await queryAll<any>(
      `SELECT b.id, b.batch_no, b.expiry_date, b.qty_available, i.name AS item_name, i.unit
       FROM batches b JOIN items i ON i.id = b.item_id
       WHERE b.business_id = ? AND b.qty_available > 0 AND b.expiry_date != '' AND b.expiry_date <= ?
       ORDER BY b.expiry_date ASC`,
      [businessId, future30Str]
    );
    expBatches.forEach((b) => {
      const expired = b.expiry_date < today;
      notifications.push({
        key: `exp:${b.id}:${b.expiry_date}:${b.qty_available}`,
        kind: expired ? 'expired' : 'expiring',
        title: expired
          ? `EXPIRED — ${b.item_name} (Batch ${b.batch_no})`
          : `Expiring soon — ${b.item_name} (Batch ${b.batch_no})`,
        sub: `${b.qty_available} ${b.unit || 'PCS'} in stock · Expiry: ${b.expiry_date}`,
        screen: 'BatchStock',
      });
    });

    // 3. Overdue sale invoices (unpaid/partial, older than 7 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const overdue = await queryAll<any>(
      `SELECT inv.id, inv.invoice_no, inv.date, inv.total, inv.paid, p.name AS party_name
       FROM invoices inv LEFT JOIN parties p ON p.id = inv.party_id
       WHERE inv.business_id = ? AND inv.type = 'sale'
         AND inv.status IN ('unpaid', 'partial') AND inv.date <= ?
       ORDER BY inv.date ASC
       LIMIT 25`,
      [businessId, cutoffStr]
    );
    overdue.forEach((inv) => {
      const due = Math.max(0, (Number(inv.total) || 0) - (Number(inv.paid) || 0));
      notifications.push({
        key: `due:${inv.id}:${due}`,
        kind: 'overdue',
        title: `Payment pending — ${inv.invoice_no}`,
        sub: `${inv.party_name || 'Cash Customer'} owes ₹${due.toFixed(2)} since ${inv.date}`,
        screen: 'InvoiceDetail',
        params: { id: inv.id },
      });
    });

    return notifications;
  },

  /** Stable signature of the current alert set. */
  signature(notifications: AppNotification[]): string {
    if (notifications.length === 0) return 'empty';
    return simpleHash(
      notifications
        .map((n) => n.key)
        .sort()
        .join('|')
    );
  },

  /** true when there are alerts the user hasn't seen yet. */
  async hasUnread(businessId: number): Promise<boolean> {
    const list = await this.getNotifications(businessId);
    if (list.length === 0) return false;
    const readSig = await settingsService.getSetting(`notif_read_sig_${businessId}`, '');
    return this.signature(list) !== readSig;
  },

  /** Persist the current alert set as "seen" — clears the bell dot. */
  async markAllRead(businessId: number, notifications: AppNotification[]): Promise<void> {
    await settingsService.setSetting(
      `notif_read_sig_${businessId}`,
      this.signature(notifications)
    );
  },
};

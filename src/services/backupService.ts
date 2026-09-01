import { queryAll, execute, runTransaction } from '../db/database';
import { authService } from './authService';
import { verifyHash } from '../utils/hash';

export const backupService = {
  async exportBackup(): Promise<string> {
    const backup: Record<string, any[]> = {};

    const tables = [
      'users',
      'company',
      'businesses',
      'categories',
      'items',
      'item_units',
      'batches',
      'serials',
      'parties',
      'invoices',
      'invoice_items',
      'payments',
      'eway_bills',
    ];

    for (const tbl of tables) {
      backup[tbl] = await queryAll(`SELECT * FROM ${tbl}`);
    }

    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: backup,
    }, null, 2);
  },

  async restoreBackup(jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;

      if (!data.items && !data.parties && !data.invoices) {
        return { success: false, error: 'Invalid backup file format' };
      }

      await runTransaction(async (db) => {
        // Clear existing
        const tables = [
          'invoice_items',
          'invoices',
          'payments',
          'serials',
          'batches',
          'item_units',
          'items',
          'categories',
          'parties',
          'eway_bills',
          'businesses',
          'company',
        ];

        for (const tbl of tables) {
          await db.runAsync(`DELETE FROM ${tbl}`);
        }

        // Restore tables
        for (const [tbl, rows] of Object.entries(data)) {
          if (!Array.isArray(rows) || rows.length === 0) continue;
          if (tbl === 'sqlite_sequence') continue;

          for (const row of rows) {
            const keys = Object.keys(row);
            const placeholders = keys.map(() => '?').join(', ');
            const values = Object.values(row) as any[];
            await db.runAsync(
              `INSERT OR REPLACE INTO ${tbl} (${keys.join(', ')}) VALUES (${placeholders})`,
              ...values
            );
          }
        }
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to restore backup' };
    }
  },

  async wipeAllData(adminPassword: string): Promise<{ success: boolean; error?: string }> {
    const admin = await authService.getUserById(1);
    if (!admin) {
      return { success: false, error: 'Admin account not found' };
    }

    const check = await authService.login(admin.username, adminPassword);
    if (!check.success) {
      return { success: false, error: 'Incorrect master admin password' };
    }

    await runTransaction(async (db) => {
      await db.runAsync('DELETE FROM invoice_items');
      await db.runAsync('DELETE FROM invoices');
      await db.runAsync('DELETE FROM payments');
      await db.runAsync('DELETE FROM serials');
      await db.runAsync('DELETE FROM batches');
      await db.runAsync('DELETE FROM item_units');
      await db.runAsync('DELETE FROM items');
      await db.runAsync('DELETE FROM categories');
      await db.runAsync('DELETE FROM parties');
      await db.runAsync('DELETE FROM eway_bills');
    });

    return { success: true };
  },
};

import { queryOne, execute } from '../db/database';

export const settingsService = {
  async getAllSettings(): Promise<Record<string, string>> {
    const row = await queryOne<{ features: string }>(
      'SELECT features FROM company WHERE id = 1'
    );
    if (!row || !row.features) {
      return {};
    }
    try {
      return JSON.parse(row.features);
    } catch {
      return {};
    }
  },

  async getSetting(key: string, defaultValue: string = ''): Promise<string> {
    const all = await this.getAllSettings();
    return all[key] ?? defaultValue;
  },

  async setSetting(key: string, value: string): Promise<void> {
    const all = await this.getAllSettings();
    all[key] = value;
    const jsonStr = JSON.stringify(all);
    await execute(
      'UPDATE company SET features = ? WHERE id = 1',
      [jsonStr]
    );
  },

  async saveSettings(settings: Record<string, string>): Promise<void> {
    const all = await this.getAllSettings();
    const merged = { ...all, ...settings };
    await execute(
      'UPDATE company SET features = ? WHERE id = 1',
      [JSON.stringify(merged)]
    );
  },
};

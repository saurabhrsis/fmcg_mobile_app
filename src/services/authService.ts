import { queryAll, queryOne, execute } from '../db/database';
import { User, UserRole, UserPermissions } from '../types';
import { simpleHash, verifyHash } from '../utils/hash';

export const authService = {
  async needsSetup(): Promise<boolean> {
    const row = await queryOne<{ c: number }>('SELECT COUNT(*) as c FROM users');
    return !row || row.c === 0;
  },

  async registerAdmin(data: {
    name: string;
    username: string;
    password: string;
    sec_question: string;
    sec_answer: string;
  }): Promise<User> {
    const exists = await queryOne('SELECT 1 FROM users WHERE username = ?', [data.username.trim()]);
    if (exists) {
      throw new Error('Username is already taken. Please choose another.');
    }
    const hash = simpleHash(data.password);
    const ansHash = simpleHash(data.sec_answer.trim().toLowerCase());
    const res = await execute(
      `INSERT INTO users (name, username, password_hash, role, permissions, active, sec_question, sec_answer_hash)
       VALUES (?, ?, ?, 'admin', '{}', 1, ?, ?)`,
      [data.name.trim(), data.username.trim(), hash, data.sec_question.trim(), ansHash]
    );

    const user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [res.lastInsertRowId]);
    return this.mapUser(user);
  },

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const row = await queryOne<any>('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (!row) {
      return { success: false, error: 'User not found' };
    }
    if (!verifyHash(password, row.password_hash)) {
      return { success: false, error: 'Invalid password' };
    }
    if (!row.active) {
      return { success: false, error: 'Account is disabled. Contact your administrator.' };
    }

    return { success: true, user: this.mapUser(row) };
  },

  async getUserById(id: number): Promise<User | null> {
    const row = await queryOne<any>('SELECT * FROM users WHERE id = ?', [id]);
    return row ? this.mapUser(row) : null;
  },

  async getAllUsers(): Promise<User[]> {
    const rows = await queryAll<any>('SELECT * FROM users ORDER BY role = "admin" DESC, id ASC');
    return rows.map((r) => this.mapUser(r));
  },

  async createUser(data: {
    name: string;
    username: string;
    password: string;
    role?: UserRole;
    permissions?: UserPermissions;
    createdBy?: number;
  }): Promise<User> {
    const exists = await queryOne('SELECT 1 FROM users WHERE username = ?', [data.username.trim()]);
    if (exists) {
      throw new Error('Username is already taken');
    }
    const hash = simpleHash(data.password);
    const perms = JSON.stringify(data.permissions || {});
    const res = await execute(
      `INSERT INTO users (name, username, password_hash, role, permissions, active, created_by)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [data.name.trim(), data.username.trim(), hash, data.role || 'staff', perms, data.createdBy || null]
    );
    const user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [res.lastInsertRowId]);
    return this.mapUser(user);
  },

  async updateUser(id: number, data: {
    name?: string;
    role?: UserRole;
    permissions?: UserPermissions;
    active?: boolean;
  }): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name.trim()); }
    if (data.role !== undefined) { updates.push('role = ?'); params.push(data.role); }
    if (data.permissions !== undefined) { updates.push('permissions = ?'); params.push(JSON.stringify(data.permissions)); }
    if (data.active !== undefined) { updates.push('active = ?'); params.push(data.active ? 1 : 0); }

    if (updates.length > 0) {
      params.push(id);
      await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }
  },

  async changePassword(id: number, newPass: string): Promise<void> {
    const hash = simpleHash(newPass);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  },

  async deleteUser(id: number): Promise<void> {
    const u = await queryOne<any>('SELECT role FROM users WHERE id = ?', [id]);
    if (u?.role === 'admin') {
      throw new Error('Cannot delete Admin account');
    }
    await execute('DELETE FROM users WHERE id = ?', [id]);
  },

  async getAdminRecoveryQuestion(): Promise<{ username: string; question: string } | null> {
    const row = await queryOne<any>('SELECT username, sec_question FROM users WHERE role = "admin" AND sec_question != "" LIMIT 1');
    if (!row) return null;
    return { username: row.username, question: row.sec_question };
  },

  async resetPasswordWithSecurityAnswer(answer: string, newPass: string): Promise<boolean> {
    const admin = await queryOne<any>('SELECT id, sec_answer_hash FROM users WHERE role = "admin" LIMIT 1');
    if (!admin || !admin.sec_answer_hash) return false;
    if (!verifyHash(answer.trim().toLowerCase(), admin.sec_answer_hash)) {
      return false;
    }
    const hash = simpleHash(newPass);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, admin.id]);
    return true;
  },

  async updateThemePrefs(userId: number, prefs: any): Promise<void> {
    await execute('UPDATE users SET theme_prefs = ? WHERE id = ?', [JSON.stringify(prefs), userId]);
  },

  mapUser(row: any): User {
    let perms = null;
    try {
      perms = row.permissions ? JSON.parse(row.permissions) : null;
    } catch (_) {
      perms = null;
    }
    let theme = null;
    try {
      theme = row.theme_prefs ? JSON.parse(row.theme_prefs) : {};
    } catch (_) {
      theme = {};
    }
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      role: row.role as UserRole,
      permissions: perms,
      active: !!row.active,
      sec_question: row.sec_question,
      theme_prefs: theme,
      created_by: row.created_by,
      created_at: row.created_at,
    };
  },
};

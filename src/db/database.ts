import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { seedInitialData } from './seed';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('fmcg.db');
      dbInstance = db;

      // Enable WAL mode & foreign keys
      try {
        await db.execAsync('PRAGMA journal_mode = WAL;');
        await db.execAsync('PRAGMA foreign_keys = ON;');
      } catch (e) {
        console.warn('Pragma setup warning:', e);
      }

      // Initialize schema
      await db.execAsync(SCHEMA_SQL);

      // Seed initial demo data
      await seedInitialData(
        (sql, params) => db.runAsync(sql, ...(params || [])),
        (sql, params) => db.getFirstAsync(sql, ...(params || []))
      );

      return db;
    } catch (err) {
      console.error('Failed to initialize database:', err);
      throw err;
    }
  })();

  return initPromise;
}

export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  return db.getAllAsync<T>(sql, ...params);
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<T>(sql, ...params);
  return row ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
  const db = await getDatabase();
  return db.runAsync(sql, ...params);
}

export async function runTransaction<T>(callback: (txDb: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  let result: T | undefined;
  await db.withTransactionAsync(async () => {
    result = await callback(db);
  });
  return result as T;
}

export async function seedDatabase() {
  const db = await getDatabase();
  await seedInitialData(
    (sql, params) => db.runAsync(sql, ...(params || [])),
    (sql, params) => db.getFirstAsync(sql, ...(params || []))
  );
}

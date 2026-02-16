// ============================================================
// DatabaseService: IndexedDB を使ったデータ永続化
// ============================================================
import { openDB, type IDBPDatabase } from 'idb';
import type { Activity, ActivityRecord, AppSettings, OngoingActivity } from '../models';
import { DEFAULT_ACTIVITIES, MAX_ACTIVITIES } from '../models';
import { generateId } from './utils';

const DB_NAME = 'activity-tracker';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

/** DB接続を取得（シングルトン） */
async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 行動カテゴリ
      if (!db.objectStoreNames.contains('activities')) {
        const store = db.createObjectStore('activities', { keyPath: 'id' });
        store.createIndex('order', 'order');
      }
      // 行動記録
      if (!db.objectStoreNames.contains('records')) {
        const store = db.createObjectStore('records', { keyPath: 'id' });
        store.createIndex('date', 'date');
        store.createIndex('activityId', 'activityId');
        store.createIndex('startTime', 'startTime');
      }
      // 設定
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// ---- Activities CRUD ----

export async function getAllActivities(): Promise<Activity[]> {
  const db = await getDB();
  const all = await db.getAll('activities');
  return all.sort((a, b) => a.order - b.order);
}

export async function getActivity(id: string): Promise<Activity | undefined> {
  const db = await getDB();
  return db.get('activities', id);
}

export async function addActivity(data: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
  const db = await getDB();
  const all = await getAllActivities();
  if (all.length >= MAX_ACTIVITIES) {
    throw new Error(`行動数の上限（${MAX_ACTIVITIES}個）に達しています`);
  }
  const activity: Activity = {
    ...data,
    id: generateId(),
    createdAt: Date.now(),
  };
  await db.put('activities', activity);
  return activity;
}

export async function updateActivity(activity: Activity): Promise<void> {
  const db = await getDB();
  await db.put('activities', activity);
}

export async function deleteActivity(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('activities', id);
}

// ---- Records CRUD ----

export async function addRecord(record: ActivityRecord): Promise<void> {
  const db = await getDB();
  await db.put('records', record);
}

export async function updateRecord(record: ActivityRecord): Promise<void> {
  const db = await getDB();
  await db.put('records', record);
}

export async function getRecordsByDate(date: string): Promise<ActivityRecord[]> {
  const db = await getDB();
  const index = db.transaction('records').store.index('date');
  const records = await index.getAll(date);
  return records.sort((a, b) => a.startTime - b.startTime);
}

export async function getRecordsByDateRange(startDate: string, endDate: string): Promise<ActivityRecord[]> {
  const db = await getDB();
  const all = await db.getAll('records');
  return all
    .filter((r) => r.date >= startDate && r.date <= endDate)
    .sort((a, b) => a.startTime - b.startTime);
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('records', id);
}

// ---- Reset ----

export async function clearAllRecords(): Promise<void> {
  const db = await getDB();
  await db.clear('records');
  // 進行中の行動もクリア
  await setOngoingActivity(null);
}

// ---- Ongoing Activity ----

export async function getOngoingActivity(): Promise<OngoingActivity | null> {
  const db = await getDB();
  const data = await db.get('settings', 'ongoing');
  return data?.value ?? null;
}

export async function setOngoingActivity(ongoing: OngoingActivity | null): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: 'ongoing', value: ongoing });
}

// ---- Settings ----

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const data = await db.get('settings', 'appSettings');
  return data?.value ?? {
    theme: { primaryColor: '#6366f1', darkMode: false },
    maxActivities: MAX_ACTIVITIES,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: 'appSettings', value: settings });
}

// ---- 初期化 ----

export async function initializeDB(): Promise<void> {
  const activities = await getAllActivities();
  if (activities.length === 0) {
    // 初回起動: デフォルト行動を投入
    for (const preset of DEFAULT_ACTIVITIES) {
      await addActivity(preset);
    }
  }
}

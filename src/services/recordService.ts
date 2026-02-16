// ============================================================
// RecordService: 行動記録の開始・停止・取得ロジック
// ============================================================
import type { ActivityRecord, OngoingActivity } from '../models';
import * as db from './database';
import { generateId, todayString, toDateString } from './utils';

/** 行動を開始 */
export async function startActivity(activityId: string): Promise<OngoingActivity> {
  const existing = await db.getOngoingActivity();
  if (existing) {
    // 先に現在の行動を停止
    await stopActivity();
  }
  const ongoing: OngoingActivity = {
    activityId,
    startTime: Date.now(),
  };
  await db.setOngoingActivity(ongoing);
  return ongoing;
}

/** 行動を停止して記録を確定 */
export async function stopActivity(): Promise<ActivityRecord | null> {
  const ongoing = await db.getOngoingActivity();
  if (!ongoing) return null;

  const now = Date.now();
  const startDate = toDateString(new Date(ongoing.startTime));
  const endDate = toDateString(new Date(now));

  // 日をまたいでいる場合、日ごとに分割して記録
  if (startDate !== endDate) {
    await splitRecordAcrossDays(ongoing, now);
  } else {
    const record: ActivityRecord = {
      id: generateId(),
      activityId: ongoing.activityId,
      startTime: ongoing.startTime,
      endTime: now,
      date: startDate,
    };
    await db.addRecord(record);
  }

  await db.setOngoingActivity(null);
  return {
    id: generateId(),
    activityId: ongoing.activityId,
    startTime: ongoing.startTime,
    endTime: now,
    date: startDate,
  };
}

/** 日をまたぐ記録を分割 */
async function splitRecordAcrossDays(ongoing: OngoingActivity, endTime: number): Promise<void> {
  const startDate = new Date(ongoing.startTime);
  const endDate = new Date(endTime);

  let current = new Date(startDate);
  let currentStart = ongoing.startTime;

  while (toDateString(current) !== toDateString(endDate)) {
    // その日の23:59:59.999まで
    const dayEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999).getTime();
    const record: ActivityRecord = {
      id: generateId(),
      activityId: ongoing.activityId,
      startTime: currentStart,
      endTime: dayEnd,
      date: toDateString(current),
    };
    await db.addRecord(record);

    // 翌日の00:00:00から
    current.setDate(current.getDate() + 1);
    currentStart = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0).getTime();
  }

  // 最終日
  const record: ActivityRecord = {
    id: generateId(),
    activityId: ongoing.activityId,
    startTime: currentStart,
    endTime: endTime,
    date: toDateString(endDate),
  };
  await db.addRecord(record);
}

/** 進行中の行動を取得 */
export async function getOngoing(): Promise<OngoingActivity | null> {
  return db.getOngoingActivity();
}

/** 特定日の記録を取得 */
export async function getRecordsForDate(date: string): Promise<ActivityRecord[]> {
  return db.getRecordsByDate(date);
}

/** 日付範囲の記録を取得 */
export async function getRecordsForRange(startDate: string, endDate: string): Promise<ActivityRecord[]> {
  return db.getRecordsByDateRange(startDate, endDate);
}

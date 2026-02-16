// ============================================================
// StatsService: 集計・怠惰補完・24hタイムライン・円グラフ用データ生成
// ============================================================
import type { Activity, ActivityRecord, AggregatedData, TimeBlock } from '../models';
import {
  IDLE_ACTIVITY_ID, IDLE_ACTIVITY_NAME, IDLE_ACTIVITY_COLOR,
  FUTURE_ACTIVITY_ID, FUTURE_COLOR, FUTURE_COLOR_DARK,
} from '../models';
import * as db from './database';
import { dayStartTimestamp, dayEndTimestamp, getDateRange } from './utils';

const MINUTES_PER_DAY = 24 * 60;

/**
 * 指定日の行動記録に怠惰を補完して集計データを返す
 * 必ず24時間 = 1440分になるように補完する
 */
export function aggregateDay(
  records: ActivityRecord[],
  activities: Activity[],
  dateStr: string
): AggregatedData[] {
  const dayStart = dayStartTimestamp(dateStr);
  const dayEnd = dayEndTimestamp(dateStr);
  const now = Date.now();
  const effectiveDayEnd = Math.min(dayEnd, now);

  // 行動ごとの合計分数を計算
  const minutesMap = new Map<string, number>();

  for (const record of records) {
    const start = Math.max(record.startTime, dayStart);
    const end = record.endTime === 0 ? now : Math.min(record.endTime, dayEnd);
    if (end <= start) continue;
    const minutes = (end - start) / (1000 * 60);
    minutesMap.set(record.activityId, (minutesMap.get(record.activityId) ?? 0) + minutes);
  }

  // 怠惰の算出: その日が今日かどうかで分母を変える
  const isToday = effectiveDayEnd < dayEnd;
  const totalAvailableMinutes = isToday
    ? (effectiveDayEnd - dayStart) / (1000 * 60)
    : MINUTES_PER_DAY;

  let totalRecorded = 0;
  for (const mins of minutesMap.values()) {
    totalRecorded += mins;
  }

  const idleMinutes = Math.max(0, totalAvailableMinutes - totalRecorded);
  if (idleMinutes > 0) {
    minutesMap.set(IDLE_ACTIVITY_ID, idleMinutes);
  }

  // 集計データ生成
  const totalMinutes = totalRecorded + idleMinutes;
  const result: AggregatedData[] = [];

  // アクティビティ情報のmap
  const activityMap = new Map<string, Activity>();
  for (const a of activities) {
    activityMap.set(a.id, a);
  }

  for (const [activityId, minutes] of minutesMap) {
    if (activityId === IDLE_ACTIVITY_ID) {
      result.push({
        activityId: IDLE_ACTIVITY_ID,
        activityName: IDLE_ACTIVITY_NAME,
        color: IDLE_ACTIVITY_COLOR,
        totalMinutes: minutes,
        percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
      });
    } else {
      const activity = activityMap.get(activityId);
      result.push({
        activityId,
        activityName: activity?.name ?? '不明',
        color: activity?.color ?? '#999',
        totalMinutes: minutes,
        percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
      });
    }
  }

  // パーセンテージ降順でソート（怠惰は最後に）
  result.sort((a, b) => {
    if (a.activityId === IDLE_ACTIVITY_ID) return 1;
    if (b.activityId === IDLE_ACTIVITY_ID) return -1;
    return b.totalMinutes - a.totalMinutes;
  });

  return result;
}

/**
 * 複数日の集計データを合算する
 */
export function aggregateRange(
  records: ActivityRecord[],
  activities: Activity[],
  startDate: string,
  endDate: string
): AggregatedData[] {
  const dates = getDateRange(startDate, endDate);
  const minutesMap = new Map<string, number>();

  // 日ごとにレコードを振り分け
  const recordsByDate = new Map<string, ActivityRecord[]>();
  for (const r of records) {
    const list = recordsByDate.get(r.date) ?? [];
    list.push(r);
    recordsByDate.set(r.date, list);
  }

  for (const dateStr of dates) {
    const dayRecords = recordsByDate.get(dateStr) ?? [];
    const dayData = aggregateDay(dayRecords, activities, dateStr);
    for (const d of dayData) {
      minutesMap.set(d.activityId, (minutesMap.get(d.activityId) ?? 0) + d.totalMinutes);
    }
  }

  // 集計データ生成
  let totalMinutes = 0;
  for (const mins of minutesMap.values()) {
    totalMinutes += mins;
  }

  const activityMap = new Map<string, Activity>();
  for (const a of activities) {
    activityMap.set(a.id, a);
  }

  const result: AggregatedData[] = [];
  for (const [activityId, minutes] of minutesMap) {
    if (activityId === IDLE_ACTIVITY_ID) {
      result.push({
        activityId: IDLE_ACTIVITY_ID,
        activityName: IDLE_ACTIVITY_NAME,
        color: IDLE_ACTIVITY_COLOR,
        totalMinutes: minutes,
        percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
      });
    } else {
      const activity = activityMap.get(activityId);
      result.push({
        activityId,
        activityName: activity?.name ?? '不明',
        color: activity?.color ?? '#999',
        totalMinutes: minutes,
        percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
      });
    }
  }

  result.sort((a, b) => {
    if (a.activityId === IDLE_ACTIVITY_ID) return 1;
    if (b.activityId === IDLE_ACTIVITY_ID) return -1;
    return b.totalMinutes - a.totalMinutes;
  });

  return result;
}

/** 今日の集計データを取得（DB含む一括処理） */
export async function getTodayStats(dateStr: string): Promise<AggregatedData[]> {
  const [records, activities] = await Promise.all([
    db.getRecordsByDate(dateStr),
    db.getAllActivities(),
  ]);
  return aggregateDay(records, activities, dateStr);
}

// ============================================================
// 24時間タイムラインブロック生成
// てっぺんが0:00、時計回りに24時間を表現
// ============================================================

/**
 * 指定日の行動記録を時系列順のTimeBlockに変換する。
 * 空白時間は「怠惰」、今日の未来時間は「残り」で補完し、
 * 常に合計1440分 (24時間) になる。
 */
export function generateTimeBlocks(
  records: ActivityRecord[],
  activities: Activity[],
  dateStr: string
): TimeBlock[] {
  const dayStart = dayStartTimestamp(dateStr);
  const dayEnd = dayEndTimestamp(dateStr);
  const now = Date.now();
  const isToday = now >= dayStart && now <= dayEnd;
  const isFutureDay = now < dayStart;

  // 未来の日はすべて「残り」
  if (isFutureDay) {
    return [{
      activityId: FUTURE_ACTIVITY_ID,
      activityName: '残り',
      color: FUTURE_COLOR,
      startMinuteOfDay: 0,
      endMinuteOfDay: 1440,
      durationMinutes: 1440,
    }];
  }

  // 今日の場合、現在時刻までが有効範囲
  const effectiveNowMin = isToday
    ? Math.min(1440, (now - dayStart) / (1000 * 60))
    : 1440;

  // アクティビティマップ
  const activityMap = new Map<string, Activity>();
  for (const a of activities) activityMap.set(a.id, a);

  // レコードを開始時刻順にソート
  const sorted = [...records].sort((a, b) => a.startTime - b.startTime);
  const blocks: TimeBlock[] = [];
  let cursor = 0; // 現在処理中の分（0〜1440）

  for (const record of sorted) {
    const recStart = Math.max(record.startTime, dayStart);
    const recEnd = record.endTime === 0
      ? (isToday ? now : dayEnd)
      : Math.min(record.endTime, dayEnd + 1);
    if (recEnd <= recStart) continue;

    const startMin = Math.max(0, (recStart - dayStart) / (1000 * 60));
    const endMin = Math.min(effectiveNowMin, (recEnd - dayStart) / (1000 * 60));
    if (endMin <= startMin) continue;

    // カーソルとの間に隙間 → 怠惰ブロック挿入
    if (startMin > cursor + 0.5) {
      blocks.push({
        activityId: IDLE_ACTIVITY_ID,
        activityName: IDLE_ACTIVITY_NAME,
        color: IDLE_ACTIVITY_COLOR,
        startMinuteOfDay: cursor,
        endMinuteOfDay: startMin,
        durationMinutes: startMin - cursor,
      });
    }

    // 行動ブロック
    const effectiveStart = Math.max(startMin, cursor);
    const activity = activityMap.get(record.activityId);
    blocks.push({
      activityId: record.activityId,
      activityName: activity?.name ?? '不明',
      color: activity?.color ?? '#999',
      startMinuteOfDay: effectiveStart,
      endMinuteOfDay: endMin,
      durationMinutes: endMin - effectiveStart,
    });

    cursor = endMin;
  }

  // 現在時刻までの残りを怠惰で埋める
  if (cursor < effectiveNowMin - 0.5) {
    blocks.push({
      activityId: IDLE_ACTIVITY_ID,
      activityName: IDLE_ACTIVITY_NAME,
      color: IDLE_ACTIVITY_COLOR,
      startMinuteOfDay: cursor,
      endMinuteOfDay: effectiveNowMin,
      durationMinutes: effectiveNowMin - cursor,
    });
  }

  // 今日の場合、未来時間を「残り」で埋める
  const finalCursor = Math.max(cursor, effectiveNowMin);
  if (isToday && finalCursor < 1440) {
    blocks.push({
      activityId: FUTURE_ACTIVITY_ID,
      activityName: '残り',
      color: FUTURE_COLOR,
      startMinuteOfDay: finalCursor,
      endMinuteOfDay: 1440,
      durationMinutes: 1440 - finalCursor,
    });
  }

  return blocks;
}

/** 今日のタイムラインブロックを取得 */
export async function getTodayTimeBlocks(dateStr: string): Promise<TimeBlock[]> {
  const [records, activities] = await Promise.all([
    db.getRecordsByDate(dateStr),
    db.getAllActivities(),
  ]);
  return generateTimeBlocks(records, activities, dateStr);
}

// ============================================================
// テスト: statsService の集計ロジック
// ============================================================
import { describe, it, expect } from 'vitest';
import { aggregateDay, generateTimeBlocks } from '../src/services/statsService';
import type { Activity, ActivityRecord } from '../src/models/types';
import { IDLE_ACTIVITY_ID, IDLE_ACTIVITY_NAME, FUTURE_ACTIVITY_ID } from '../src/models/types';

const mockActivities: Activity[] = [
  { id: 'study', name: '勉強', color: '#6366f1', icon: '📚', order: 0, createdAt: 0 },
  { id: 'exercise', name: '運動', color: '#10b981', icon: '🏃', order: 1, createdAt: 0 },
];

function makeTimestamp(dateStr: string, hour: number, minute: number = 0): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
}

describe('aggregateDay', () => {
  const date = '2025-12-01';

  it('記録がない場合、全時間が怠惰になる', () => {
    // 過去日なので24時間すべてが怠惰
    const result = aggregateDay([], mockActivities, '2020-01-01');
    const idle = result.find((r) => r.activityId === IDLE_ACTIVITY_ID);
    expect(idle).toBeDefined();
    expect(idle!.activityName).toBe(IDLE_ACTIVITY_NAME);
    // 24時間 = 1440分
    expect(Math.round(idle!.totalMinutes)).toBe(1440);
    expect(idle!.percentage).toBeCloseTo(100, 0);
  });

  it('1つの行動記録がある場合、残りが怠惰で補完される', () => {
    const records: ActivityRecord[] = [
      {
        id: '1',
        activityId: 'study',
        startTime: makeTimestamp('2020-01-01', 10, 0),
        endTime: makeTimestamp('2020-01-01', 12, 0),
        date: '2020-01-01',
      },
    ];
    const result = aggregateDay(records, mockActivities, '2020-01-01');

    const study = result.find((r) => r.activityId === 'study');
    expect(study).toBeDefined();
    expect(Math.round(study!.totalMinutes)).toBe(120); // 2時間

    const idle = result.find((r) => r.activityId === IDLE_ACTIVITY_ID);
    expect(idle).toBeDefined();
    expect(Math.round(idle!.totalMinutes)).toBe(1320); // 22時間

    // 合計が1440分（24時間）になること
    const total = result.reduce((sum, r) => sum + r.totalMinutes, 0);
    expect(Math.round(total)).toBe(1440);
  });

  it('複数の行動記録が正しく集計される', () => {
    const records: ActivityRecord[] = [
      {
        id: '1',
        activityId: 'study',
        startTime: makeTimestamp('2020-01-01', 8, 0),
        endTime: makeTimestamp('2020-01-01', 10, 0),
        date: '2020-01-01',
      },
      {
        id: '2',
        activityId: 'exercise',
        startTime: makeTimestamp('2020-01-01', 10, 0),
        endTime: makeTimestamp('2020-01-01', 11, 0),
        date: '2020-01-01',
      },
      {
        id: '3',
        activityId: 'study',
        startTime: makeTimestamp('2020-01-01', 14, 0),
        endTime: makeTimestamp('2020-01-01', 16, 30),
        date: '2020-01-01',
      },
    ];

    const result = aggregateDay(records, mockActivities, '2020-01-01');

    const study = result.find((r) => r.activityId === 'study');
    expect(study).toBeDefined();
    expect(Math.round(study!.totalMinutes)).toBe(270); // 2h + 2h30m = 270min

    const exercise = result.find((r) => r.activityId === 'exercise');
    expect(exercise).toBeDefined();
    expect(Math.round(exercise!.totalMinutes)).toBe(60); // 1h

    const idle = result.find((r) => r.activityId === IDLE_ACTIVITY_ID);
    expect(idle).toBeDefined();
    expect(Math.round(idle!.totalMinutes)).toBe(1110); // 24h - 5h30m = 18h30m = 1110min

    const total = result.reduce((sum, r) => sum + r.totalMinutes, 0);
    expect(Math.round(total)).toBe(1440);
  });

  it('パーセンテージの合計が100%になる', () => {
    const records: ActivityRecord[] = [
      {
        id: '1',
        activityId: 'study',
        startTime: makeTimestamp('2020-01-01', 0, 0),
        endTime: makeTimestamp('2020-01-01', 6, 0),
        date: '2020-01-01',
      },
    ];

    const result = aggregateDay(records, mockActivities, '2020-01-01');
    const totalPercent = result.reduce((sum, r) => sum + r.percentage, 0);
    expect(totalPercent).toBeCloseTo(100, 1);
  });
});

// ============================================================
// generateTimeBlocks: 24時間タイムラインのテスト
// ============================================================
describe('generateTimeBlocks', () => {
  it('記録がない過去日は全体が怠惰ブロックになる', () => {
    const blocks = generateTimeBlocks([], mockActivities, '2020-01-01');
    expect(blocks.length).toBe(1);
    expect(blocks[0].activityId).toBe(IDLE_ACTIVITY_ID);
    expect(Math.round(blocks[0].startMinuteOfDay)).toBe(0);
    expect(Math.round(blocks[0].durationMinutes)).toBe(1440);
  });

  it('ブロックが時系列順に並び、合計が1440分になる（過去日）', () => {
    const records: ActivityRecord[] = [
      {
        id: '1',
        activityId: 'study',
        startTime: makeTimestamp('2020-01-01', 8, 0),
        endTime: makeTimestamp('2020-01-01', 10, 0),
        date: '2020-01-01',
      },
      {
        id: '2',
        activityId: 'exercise',
        startTime: makeTimestamp('2020-01-01', 14, 0),
        endTime: makeTimestamp('2020-01-01', 15, 30),
        date: '2020-01-01',
      },
    ];

    const blocks = generateTimeBlocks(records, mockActivities, '2020-01-01');

    // 全ブロックの合計が1440分
    const totalMin = blocks.reduce((s, b) => s + b.durationMinutes, 0);
    expect(Math.round(totalMin)).toBe(1440);

    // 時系列順に並んでいる
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].startMinuteOfDay).toBeGreaterThanOrEqual(blocks[i - 1].endMinuteOfDay - 1);
    }

    // 0:00〜8:00 が怠惰
    expect(blocks[0].activityId).toBe(IDLE_ACTIVITY_ID);
    expect(Math.round(blocks[0].startMinuteOfDay)).toBe(0);
    expect(Math.round(blocks[0].endMinuteOfDay)).toBe(480);

    // 8:00〜10:00 が勉強
    expect(blocks[1].activityId).toBe('study');
    expect(Math.round(blocks[1].durationMinutes)).toBe(120);

    // 10:00〜14:00 が怠惰
    expect(blocks[2].activityId).toBe(IDLE_ACTIVITY_ID);
    expect(Math.round(blocks[2].durationMinutes)).toBe(240);

    // 14:00〜15:30 が運動
    expect(blocks[3].activityId).toBe('exercise');
    expect(Math.round(blocks[3].durationMinutes)).toBe(90);

    // 15:30〜24:00 が怠惰
    expect(blocks[4].activityId).toBe(IDLE_ACTIVITY_ID);
  });

  it('連続した行動の間に怠惰ブロックが挟まらない', () => {
    const records: ActivityRecord[] = [
      {
        id: '1',
        activityId: 'study',
        startTime: makeTimestamp('2020-01-01', 10, 0),
        endTime: makeTimestamp('2020-01-01', 12, 0),
        date: '2020-01-01',
      },
      {
        id: '2',
        activityId: 'exercise',
        startTime: makeTimestamp('2020-01-01', 12, 0),
        endTime: makeTimestamp('2020-01-01', 13, 0),
        date: '2020-01-01',
      },
    ];

    const blocks = generateTimeBlocks(records, mockActivities, '2020-01-01');

    // study の直後が exercise であること（間に idle が入らない）
    const studyIdx = blocks.findIndex((b) => b.activityId === 'study');
    const exerciseIdx = blocks.findIndex((b) => b.activityId === 'exercise');
    expect(exerciseIdx).toBe(studyIdx + 1);
  });

  it('未来の日は全体が「残り」ブロックになる', () => {
    const blocks = generateTimeBlocks([], mockActivities, '2099-12-31');
    expect(blocks.length).toBe(1);
    expect(blocks[0].activityId).toBe(FUTURE_ACTIVITY_ID);
    expect(Math.round(blocks[0].durationMinutes)).toBe(1440);
  });
});

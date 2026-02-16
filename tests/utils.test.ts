// ============================================================
// テスト: utils ユーティリティ関数
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  toDateString,
  dayStartTimestamp,
  dayEndTimestamp,
  formatMinutes,
  getWeekRange,
  getMonthRange,
  getYearRange,
  getDateRange,
  formatTime,
  formatDate,
} from '../src/services/utils';

describe('toDateString', () => {
  it('Date を YYYY-MM-DD に変換する', () => {
    const date = new Date(2025, 0, 5); // 2025-01-05
    expect(toDateString(date)).toBe('2025-01-05');
  });

  it('月・日が1桁でもゼロ埋めされる', () => {
    const date = new Date(2025, 2, 3); // 2025-03-03
    expect(toDateString(date)).toBe('2025-03-03');
  });
});

describe('dayStartTimestamp / dayEndTimestamp', () => {
  it('日の開始は 00:00:00', () => {
    const ts = dayStartTimestamp('2025-06-15');
    const d = new Date(ts);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('日の終了は 23:59:59', () => {
    const ts = dayEndTimestamp('2025-06-15');
    const d = new Date(ts);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
  });
});

describe('formatMinutes', () => {
  it('分だけの場合', () => {
    expect(formatMinutes(30)).toBe('30分');
  });

  it('時間だけの場合', () => {
    expect(formatMinutes(120)).toBe('2時間');
  });

  it('時間と分がある場合', () => {
    expect(formatMinutes(150)).toBe('2時間30分');
  });
});

describe('getWeekRange', () => {
  it('月曜開始・日曜終了の週範囲を返す', () => {
    // 2025-01-08 は水曜
    const range = getWeekRange('2025-01-08');
    expect(range.start).toBe('2025-01-06'); // 月曜
    expect(range.end).toBe('2025-01-12');   // 日曜
  });
});

describe('getMonthRange', () => {
  it('月の開始と終了を返す', () => {
    const range = getMonthRange('2025-02-15');
    expect(range.start).toBe('2025-02-01');
    expect(range.end).toBe('2025-02-28');
  });

  it('うるう年の2月', () => {
    const range = getMonthRange('2024-02-15');
    expect(range.end).toBe('2024-02-29');
  });
});

describe('getYearRange', () => {
  it('年の開始と終了を返す', () => {
    const range = getYearRange('2025-06-15');
    expect(range.start).toBe('2025-01-01');
    expect(range.end).toBe('2025-12-31');
  });
});

describe('getDateRange', () => {
  it('日付の連続リストを生成する', () => {
    const dates = getDateRange('2025-01-29', '2025-02-02');
    expect(dates).toEqual([
      '2025-01-29',
      '2025-01-30',
      '2025-01-31',
      '2025-02-01',
      '2025-02-02',
    ]);
  });
});

describe('formatTime', () => {
  it('タイムスタンプを HH:MM に変換する', () => {
    const ts = new Date(2025, 0, 1, 9, 5).getTime();
    expect(formatTime(ts)).toBe('09:05');
  });
});

describe('formatDate', () => {
  it('YYYY-MM-DD を日本語形式に変換する', () => {
    expect(formatDate('2025-01-05')).toBe('2025年1月5日');
  });
});

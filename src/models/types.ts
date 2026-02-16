// ============================================================
// 型定義: アプリケーション全体で使用する型
// ============================================================

/** 行動カテゴリ */
export interface Activity {
  id: string;
  name: string;
  color: string;
  icon: string;        // emoji
  order: number;
  createdAt: number;   // timestamp
}

/** 行動記録（1エントリ＝開始〜終了） */
export interface ActivityRecord {
  id: string;
  activityId: string;
  startTime: number;   // timestamp
  endTime: number;     // timestamp (0 = 進行中)
  date: string;        // YYYY-MM-DD（開始日）
}

/** 進行中の行動 */
export interface OngoingActivity {
  activityId: string;
  startTime: number;
}

/** テーマ設定 */
export interface ThemeConfig {
  primaryColor: string;
  darkMode: boolean;
}

/** アプリ設定 */
export interface AppSettings {
  theme: ThemeConfig;
  maxActivities: number;
}

/** 集計用データ */
export interface AggregatedData {
  activityId: string;
  activityName: string;
  color: string;
  totalMinutes: number;
  percentage: number;
}

/** 24時間タイムラインの1ブロック */
export interface TimeBlock {
  activityId: string;
  activityName: string;
  color: string;
  startMinuteOfDay: number;  // 0〜1440
  endMinuteOfDay: number;    // 0〜1440
  durationMinutes: number;
}

/** 未来時間の特殊ID・カラー */
export const FUTURE_ACTIVITY_ID = '__future__';
export const FUTURE_COLOR = '#e5e7eb';
export const FUTURE_COLOR_DARK = '#374151';

/** タブ種別 */
export type TabType = 'home' | 'records' | 'settings';

/** 集計単位 */
export type AggregationUnit = 'day' | 'week' | 'month' | 'year';

/** 怠惰の特殊ID */
export const IDLE_ACTIVITY_ID = '__idle__';
export const IDLE_ACTIVITY_NAME = '怠惰';
export const IDLE_ACTIVITY_COLOR = '#9ca3af';

/** デフォルトの行動上限 */
export const MAX_ACTIVITIES = 15;

/** デフォルトの行動プリセット */
export const DEFAULT_ACTIVITIES: Omit<Activity, 'id' | 'createdAt'>[] = [
  { name: '勉強', color: '#6366f1', icon: '📚', order: 0 },
  { name: '研究', color: '#8b5cf6', icon: '🔬', order: 1 },
  { name: '運動', color: '#10b981', icon: '🏃', order: 2 },
  { name: '仕事', color: '#f59e0b', icon: '💼', order: 3 },
  { name: '読書', color: '#3b82f6', icon: '📖', order: 4 },
  { name: '休憩', color: '#ec4899', icon: '☕', order: 5 },
];

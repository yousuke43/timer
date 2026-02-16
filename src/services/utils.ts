// ============================================================
// ユーティリティ関数
// ============================================================

/** UUIDv4 を生成 */
export function generateId(): string {
  return crypto.randomUUID?.() ??
    'xxxx-xxxx-xxxx'.replace(/x/g, () =>
      Math.floor(Math.random() * 16).toString(16)
    );
}

/** Date → YYYY-MM-DD */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 今日の YYYY-MM-DD */
export function todayString(): string {
  return toDateString(new Date());
}

/** YYYY-MM-DD → その日の 00:00:00 タイムスタンプ */
export function dayStartTimestamp(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/** YYYY-MM-DD → その日の 23:59:59.999 タイムスタンプ */
export function dayEndTimestamp(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/** 分を「○時間○分」に変換 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

/** 日付範囲を生成: [startDate, endDate] */
export function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (current <= endDate) {
    dates.push(toDateString(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** 指定日が含まれる週の月〜日を取得 */
export function getWeekRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateString(monday), end: toDateString(sunday) };
}

/** 指定月の範囲を取得 */
export function getMonthRange(dateStr: string): { start: string; end: string } {
  const [y, m] = dateStr.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0); // 月末
  return { start: toDateString(start), end: toDateString(end) };
}

/** 指定年の範囲を取得 */
export function getYearRange(dateStr: string): { start: string; end: string } {
  const y = parseInt(dateStr.split('-')[0]);
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

/** タイムスタンプを HH:MM 表示 */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 日付表示フォーマット */
export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

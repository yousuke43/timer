// ============================================================
// Theme: テーマ適用ロジック
// ============================================================
import type { ThemeConfig } from './models';

/** テーマを DOM に反映 */
export function applyTheme(config: ThemeConfig): void {
  const root = document.documentElement;

  // プライマリカラーをCSS変数に設定
  root.style.setProperty('--primary', config.primaryColor);

  // プライマリから暗い色を派生
  root.style.setProperty('--primary-dark', darken(config.primaryColor, 20));
  root.style.setProperty('--primary-light', lighten(config.primaryColor, 30));

  // ダークモード
  if (config.darkMode) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // meta theme-color 更新
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', config.darkMode ? '#1f2937' : config.primaryColor);
  }
}

function darken(hex: string, percent: number): string {
  return adjustColor(hex, -percent);
}

function lighten(hex: string, percent: number): string {
  return adjustColor(hex, percent);
}

function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

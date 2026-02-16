// ============================================================
// HomePage: ホーム画面（行動ボタン + 24h円グラフ + 行動中画面）
// ============================================================
import type { Activity, OngoingActivity, TimeBlock } from '../models';
import { database, recordService, statsService } from '../services';
import { todayString, formatTime } from '../services/utils';
import { render24HourChart } from '../components/chartRenderer';

export class HomePage {
  private container: HTMLElement;
  private ongoing: OngoingActivity | null = null;
  private activities: Activity[] = [];
  private timeBlocks: TimeBlock[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render(): Promise<void> {
    // データ取得
    const [activities, ongoing, timeBlocks] = await Promise.all([
      database.getAllActivities(),
      recordService.getOngoing(),
      statsService.getTodayTimeBlocks(todayString()),
    ]);

    this.activities = activities;
    this.ongoing = ongoing;
    this.timeBlocks = timeBlocks;

    if (this.ongoing) {
      this.renderOngoingView();
    } else {
      this.renderIdleView();
    }
  }

  /** 待機中画面（行動ボタン + 円グラフ） */
  private renderIdleView(): void {
    this.container.innerHTML = `
      <div class="page home-page">
        <h2 class="page-title">${todayString()}</h2>
        <div class="chart-container">
          <canvas id="home-chart" width="260" height="260"></canvas>
        </div>
        <div class="activity-buttons" id="activity-buttons"></div>
      </div>
    `;

    // 24時間タイムライン円グラフ描画
    const canvas = document.getElementById('home-chart') as HTMLCanvasElement;
    if (canvas) {
      render24HourChart(canvas, this.timeBlocks);
    }

    // 行動ボタン
    const btnContainer = document.getElementById('activity-buttons');
    if (btnContainer) {
      this.renderActivityButtons(btnContainer);
    }
  }

  /** 行動中画面 */
  private renderOngoingView(): void {
    const activity = this.activities.find((a) => a.id === this.ongoing!.activityId);
    const startTimeStr = formatTime(this.ongoing!.startTime);

    this.container.innerHTML = `
      <div class="page ongoing-page">
        <div class="ongoing-card">
          <h2 class="ongoing-title">${activity?.name ?? '不明'}</h2>
          <p class="ongoing-status">行動中</p>
          <p class="ongoing-start">開始: ${startTimeStr}</p>
          <button class="btn btn-stop" id="btn-stop">
            ストップ
          </button>
        </div>
        <div class="chart-container" style="margin-top:24px;">
          <canvas id="home-chart" width="260" height="260"></canvas>
        </div>
      </div>
    `;

    // ストップボタン
    document.getElementById('btn-stop')?.addEventListener('click', () => this.handleStop());

    // 24時間タイムライン円グラフ
    const canvas = document.getElementById('home-chart') as HTMLCanvasElement;
    if (canvas) {
      render24HourChart(canvas, this.timeBlocks);
    }
  }

  /** 行動ボタンを描画 */
  private renderActivityButtons(container: HTMLElement): void {
    const grid = document.createElement('div');
    grid.className = 'btn-grid';

    for (const activity of this.activities) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-activity';
      btn.style.setProperty('--activity-color', activity.color);
      btn.innerHTML = `
        <span class="btn-activity-name">${activity.name}</span>
      `;
      btn.addEventListener('click', () => this.handleStart(activity));
      grid.appendChild(btn);
    }

    container.appendChild(grid);
  }

  /** 行動開始 */
  private async handleStart(activity: Activity): Promise<void> {
    // 行動中なら確認
    if (this.ongoing) {
      const currentActivity = this.activities.find((a) => a.id === this.ongoing!.activityId);
      const confirmed = confirm(
        `「${currentActivity?.name ?? '不明'}」を中止して「${activity.name}」を開始しますか？`
      );
      if (!confirmed) return;
    }

    await recordService.startActivity(activity.id);
    await this.render();
  }

  /** 行動停止 */
  private async handleStop(): Promise<void> {
    await recordService.stopActivity();
    await this.render();
  }
}

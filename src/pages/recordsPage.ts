// ============================================================
// RecordsPage: 記録タブ（日/週/月/年 切り替え + 円グラフ + 詳細）
// ============================================================
import type { AggregationUnit, AggregatedData, Activity, ActivityRecord, TimeBlock } from '../models';
import { database, recordService, statsService } from '../services';
import {
  todayString,
  formatDate,
  getWeekRange,
  getMonthRange,
  getYearRange,
  toDateString,
} from '../services/utils';
import { render24HourChart, renderAggregatedChart } from '../components/chartRenderer';
import { renderLegend } from '../components/legend';

export class RecordsPage {
  private container: HTMLElement;
  private selectedDate: string = todayString();
  private unit: AggregationUnit = 'day';
  private data: AggregatedData[] = [];
  private timeBlocks: TimeBlock[] = [];
  private activities: Activity[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render(): Promise<void> {
    this.activities = await database.getAllActivities();
    await this.loadData();
    this.renderView();
  }

  private async loadData(): Promise<void> {
    const range = this.getRange();
    if (this.unit === 'day') {
      const records = await recordService.getRecordsForDate(this.selectedDate);
      this.data = statsService.aggregateDay(records, this.activities, this.selectedDate);
      this.timeBlocks = statsService.generateTimeBlocks(records, this.activities, this.selectedDate);
    } else {
      const records = await recordService.getRecordsForRange(range.start, range.end);
      this.data = statsService.aggregateRange(records, this.activities, range.start, range.end);
      this.timeBlocks = [];
    }
  }

  private getRange(): { start: string; end: string } {
    switch (this.unit) {
      case 'day':
        return { start: this.selectedDate, end: this.selectedDate };
      case 'week':
        return getWeekRange(this.selectedDate);
      case 'month':
        return getMonthRange(this.selectedDate);
      case 'year':
        return getYearRange(this.selectedDate);
    }
  }

  private getRangeLabel(): string {
    const range = this.getRange();
    switch (this.unit) {
      case 'day':
        return formatDate(this.selectedDate);
      case 'week':
        return `${formatDate(range.start)} 〜 ${formatDate(range.end)}`;
      case 'month': {
        const [y, m] = this.selectedDate.split('-');
        return `${y}年${parseInt(m)}月`;
      }
      case 'year': {
        return `${this.selectedDate.split('-')[0]}年`;
      }
    }
  }

  private renderView(): void {
    this.container.innerHTML = `
      <div class="page records-page">
        <h2 class="page-title">記録</h2>

        <div class="unit-selector">
          ${(['day', 'week', 'month', 'year'] as AggregationUnit[])
            .map(
              (u) => `<button class="unit-btn ${this.unit === u ? 'active' : ''}" data-unit="${u}">
                ${u === 'day' ? '日' : u === 'week' ? '週' : u === 'month' ? '月' : '年'}
              </button>`
            )
            .join('')}
        </div>

        <div class="date-navigator">
          <button class="nav-btn" id="date-prev">◀</button>
          <span class="date-label">${this.getRangeLabel()}</span>
          <button class="nav-btn" id="date-next">▶</button>
        </div>

        ${this.unit === 'day' ? `
          <div class="date-picker-row">
            <input type="date" id="date-input" value="${this.selectedDate}" class="date-input" />
          </div>
        ` : ''}

        <div class="chart-container">
          <canvas id="records-chart" width="260" height="260"></canvas>
        </div>
        <div id="records-legend" class="legend-container"></div>
      </div>
    `;

    // イベントバインド
    this.container.querySelectorAll('.unit-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        this.unit = (e.currentTarget as HTMLElement).dataset.unit as AggregationUnit;
        await this.loadData();
        this.renderView();
      });
    });

    document.getElementById('date-prev')?.addEventListener('click', () => this.navigate(-1));
    document.getElementById('date-next')?.addEventListener('click', () => this.navigate(1));

    document.getElementById('date-input')?.addEventListener('change', async (e) => {
      this.selectedDate = (e.target as HTMLInputElement).value;
      await this.loadData();
      this.renderView();
    });

    // 円グラフ描画: 日=24hタイムライン、週/月/年=集計グラフ
    const canvas = document.getElementById('records-chart') as HTMLCanvasElement;
    if (canvas) {
      if (this.unit === 'day') {
        render24HourChart(canvas, this.timeBlocks);
      } else {
        renderAggregatedChart(canvas, this.data);
      }
    }
    const legendEl = document.getElementById('records-legend');
    if (legendEl) {
      renderLegend(legendEl, this.data);
    }
  }

  private async navigate(direction: -1 | 1): Promise<void> {
    const d = new Date(this.selectedDate + 'T00:00:00');

    switch (this.unit) {
      case 'day':
        d.setDate(d.getDate() + direction);
        break;
      case 'week':
        d.setDate(d.getDate() + direction * 7);
        break;
      case 'month':
        d.setMonth(d.getMonth() + direction);
        break;
      case 'year':
        d.setFullYear(d.getFullYear() + direction);
        break;
    }

    this.selectedDate = toDateString(d);
    await this.loadData();
    this.renderView();
  }
}

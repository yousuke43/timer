// ============================================================
// ChartRenderer: 24時間タイムライン円グラフ & 集計円グラフ
// ============================================================
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';
import type { AggregatedData, TimeBlock } from '../models';
import { FUTURE_ACTIVITY_ID } from '../models';

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

// チャートインスタンス管理（canvas IDごと）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chartInstances = new Map<string, any>();

function destroyInstance(canvasId: string): void {
  const existing = chartInstances.get(canvasId);
  if (existing) {
    existing.destroy();
    chartInstances.delete(canvasId);
  }
}

// ============================================================
// 24時間タイムライン用 Chart.js プラグイン: 時刻ラベル描画
// ============================================================
const hourLabelsPlugin = {
  id: 'hourLabels',
  afterDraw(chart: Chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;
    const outerRadius =
      Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
    const labelRadius = outerRadius + 18;
    const tickInner = outerRadius + 2;
    const tickOuter = outerRadius + 8;

    ctx.save();

    // 主要時刻の目盛り線（0,6,12,18）
    const majorHours = [0, 6, 12, 18];
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    for (const h of majorHours) {
      const angle = ((h / 24) * 360 - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(centerX + tickInner * Math.cos(angle), centerY + tickInner * Math.sin(angle));
      ctx.lineTo(centerX + tickOuter * Math.cos(angle), centerY + tickOuter * Math.sin(angle));
      ctx.stroke();
    }

    // 補助目盛り線（3,9,15,21）
    const minorHours = [3, 9, 15, 21];
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    for (const h of minorHours) {
      const angle = ((h / 24) * 360 - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(centerX + tickInner * Math.cos(angle), centerY + tickInner * Math.sin(angle));
      ctx.lineTo(centerX + (tickOuter - 2) * Math.cos(angle), centerY + (tickOuter - 2) * Math.sin(angle));
      ctx.stroke();
    }

    // 時刻ラベル
    const isDark = document.documentElement.classList.contains('dark');
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labelHours = [0, 3, 6, 9, 12, 15, 18, 21];
    for (const h of labelHours) {
      const angle = ((h / 24) * 360 - 90) * (Math.PI / 180);
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);
      ctx.fillText(`${h}`, x, y);
    }

    ctx.restore();
  },
};

// ============================================================
// 24時間タイムライン円グラフ (日単位)
// てっぺん=0:00, 時計回り, 合計24時間
// ============================================================
export function render24HourChart(canvas: HTMLCanvasElement, blocks: TimeBlock[]): void {
  const canvasId = canvas.id || 'default';
  destroyInstance(canvasId);

  if (blocks.length === 0) {
    drawEmptyMessage(canvas);
    return;
  }

  const isDark = document.documentElement.classList.contains('dark');

  // 未来ブロックのカラーをダークモード対応
  const bgColors = blocks.map((b) =>
    b.activityId === FUTURE_ACTIVITY_ID
      ? (isDark ? '#374151' : '#e5e7eb')
      : b.color
  );

  const instance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: blocks.map((b) => b.activityName),
      datasets: [
        {
          data: blocks.map((b) => b.durationMinutes),
          backgroundColor: bgColors,
          borderColor: blocks.map((b) =>
            b.durationMinutes > 3 ? (isDark ? '#1e293b' : '#ffffff') : 'transparent'
          ),
          borderWidth: 1,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      rotation: -90,       // てっぺん = 0:00
      circumference: 360,  // 完全な円
      cutout: '50%',
      layout: {
        padding: 24,       // 時刻ラベル用のスペース
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: (item) => {
            // 未来ブロックはツールチップ非表示
            return blocks[item.dataIndex].activityId !== FUTURE_ACTIVITY_ID;
          },
          callbacks: {
            title: () => '',
            label(ctx) {
              const block = blocks[ctx.dataIndex];
              const startH = Math.floor(block.startMinuteOfDay / 60);
              const startM = Math.floor(block.startMinuteOfDay % 60);
              const endH = Math.floor(block.endMinuteOfDay / 60);
              const endM = Math.floor(block.endMinuteOfDay % 60);
              const timeRange =
                `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}` +
                ` ~ ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
              const dur = block.durationMinutes;
              const h = Math.floor(dur / 60);
              const m = Math.round(dur % 60);
              const durStr = h > 0 ? `${h}時間${m}分` : `${m}分`;
              return ` ${block.activityName}  ${timeRange}  (${durStr})`;
            },
          },
        },
      },
      animation: {
        duration: 600,
      },
    },
    plugins: [hourLabelsPlugin as any],
  });

  chartInstances.set(canvasId, instance);
}

// ============================================================
// 集計円グラフ（週/月/年 用）
// ============================================================
export function renderAggregatedChart(canvas: HTMLCanvasElement, data: AggregatedData[]): void {
  const canvasId = canvas.id || 'default-agg';
  destroyInstance(canvasId);

  if (data.length === 0) {
    drawEmptyMessage(canvas);
    return;
  }

  const instance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: data.map((d) => d.activityName),
      datasets: [
        {
          data: data.map((d) => Math.round(d.totalMinutes * 10) / 10),
          backgroundColor: data.map((d) => d.color),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '55%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const d = data[ctx.dataIndex];
              const h = Math.floor(d.totalMinutes / 60);
              const m = Math.round(d.totalMinutes % 60);
              const time = h > 0 ? `${h}時間${m}分` : `${m}分`;
              return `${d.activityName}: ${time} (${d.percentage.toFixed(1)}%)`;
            },
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, instance);
}

// ============================================================
// ヘルパー
// ============================================================
function drawEmptyMessage(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('データなし', canvas.width / 2, canvas.height / 2);
  }
}

/** 全チャートを破棄 */
export function destroyAllCharts(): void {
  for (const [, chart] of chartInstances) {
    chart.destroy();
  }
  chartInstances.clear();
}

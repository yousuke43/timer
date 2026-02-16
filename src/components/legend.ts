// ============================================================
// Legend: 円グラフのカスタム凡例
// ============================================================
import type { AggregatedData } from '../models';
import { formatMinutes } from '../services/utils';

export function renderLegend(container: HTMLElement, data: AggregatedData[]): void {
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = '<p class="no-data">データがありません</p>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'legend-list';

  for (const item of data) {
    const row = document.createElement('div');
    row.className = 'legend-item';
    row.innerHTML = `
      <span class="legend-color" style="background-color: ${item.color}"></span>
      <span class="legend-name">${item.activityName}</span>
      <span class="legend-time">${formatMinutes(item.totalMinutes)}</span>
      <span class="legend-percent">${item.percentage.toFixed(1)}%</span>
    `;
    list.appendChild(row);
  }

  container.appendChild(list);
}

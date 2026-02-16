// ============================================================
// TabBar: 下部タブバー コンポーネント
// ============================================================
import type { TabType } from '../models';

export function renderTabBar(
  container: HTMLElement,
  activeTab: TabType,
  onTabChange: (tab: TabType) => void
): void {
  container.innerHTML = '';

  const tabs: { id: TabType; label: string }[] = [
    { id: 'home', label: 'ホーム' },
    { id: 'records', label: '記録' },
    { id: 'settings', label: '設定' },
  ];

  const nav = document.createElement('nav');
  nav.className = 'tab-bar';

  for (const tab of tabs) {
    const btn = document.createElement('button');
    btn.className = `tab-item ${activeTab === tab.id ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="tab-label">${tab.label}</span>
    `;
    btn.addEventListener('click', () => onTabChange(tab.id));
    nav.appendChild(btn);
  }

  container.appendChild(nav);
}

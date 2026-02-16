// ============================================================
// App: メインアプリケーション（ルーティング + 初期化）
// ============================================================
import type { TabType } from './models';
import { database } from './services';
import { HomePage } from './pages/homePage';
import { RecordsPage } from './pages/recordsPage';
import { SettingsPage } from './pages/settingsPage';
import { renderTabBar } from './components/tabBar';
import { applyTheme } from './theme';

export class App {
  private currentTab: TabType = 'home';
  private contentEl!: HTMLElement;
  private tabBarEl!: HTMLElement;

  async init(): Promise<void> {
    const appEl = document.getElementById('app');
    if (!appEl) throw new Error('#app not found');

    // アプリ構造を構築
    appEl.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <span class="app-header-title">Activity Tracker</span>
        </header>
        <main class="app-content" id="app-content"></main>
        <footer class="app-footer" id="app-footer"></footer>
      </div>
    `;

    this.contentEl = document.getElementById('app-content')!;
    this.tabBarEl = document.getElementById('app-footer')!;

    // DB初期化
    await database.initializeDB();

    // テーマ適用
    const settings = await database.getSettings();
    applyTheme(settings.theme);

    // 初回描画
    this.renderTab();
  }

  private renderTab(): void {
    // タブバー描画
    renderTabBar(this.tabBarEl, this.currentTab, (tab) => {
      this.currentTab = tab;
      this.renderTab();
    });

    // コンテンツ描画
    this.contentEl.innerHTML = '';

    switch (this.currentTab) {
      case 'home': {
        const page = new HomePage(this.contentEl);
        page.render();
        break;
      }
      case 'records': {
        const page = new RecordsPage(this.contentEl);
        page.render();
        break;
      }
      case 'settings': {
        const page = new SettingsPage(this.contentEl);
        page.render();
        break;
      }
    }
  }
}

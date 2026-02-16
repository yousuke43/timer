// ============================================================
// SettingsPage: 設定タブ（行動管理 + テーマ設定）
// ============================================================
import type { Activity, AppSettings } from '../models';
import { MAX_ACTIVITIES } from '../models';
import { database } from '../services';
import { generateId } from '../services/utils';
import { applyTheme } from '../theme';

export class SettingsPage {
  private container: HTMLElement;
  private activities: Activity[] = [];
  private settings: AppSettings = {
    theme: { primaryColor: '#6366f1', darkMode: false },
    maxActivities: MAX_ACTIVITIES,
  };

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render(): Promise<void> {
    const [activities, settings] = await Promise.all([
      database.getAllActivities(),
      database.getSettings(),
    ]);
    this.activities = activities;
    this.settings = settings;
    this.renderView();
  }

  private renderView(): void {
    this.container.innerHTML = `
      <div class="page settings-page">
        <h2 class="page-title">設定</h2>

        <section class="settings-section">
          <h3 class="section-title">行動管理</h3>
          <p class="section-desc">${this.activities.length} / ${this.settings.maxActivities} 個登録済み</p>

          <div class="activity-list" id="activity-list">
            ${this.activities
              .map(
                (a) => `
              <div class="activity-row" data-id="${a.id}">
                <span class="activity-color-dot" style="background:${a.color}"></span>
                <span class="activity-name-display">${a.name}</span>
                <button class="btn-icon btn-edit" data-id="${a.id}" title="編集">編集</button>
                <button class="btn-icon btn-delete" data-id="${a.id}" title="削除">削除</button>
              </div>
            `
              )
              .join('')}
          </div>

          ${
            this.activities.length < this.settings.maxActivities
              ? `<button class="btn btn-add" id="btn-add-activity">＋ 行動を追加</button>`
              : `<p class="limit-message">上限に達しています</p>`
          }
        </section>

        <section class="settings-section">
          <h3 class="section-title">表示設定</h3>

          <div class="setting-row">
            <label for="theme-color">テーマカラー</label>
            <input type="color" id="theme-color" value="${this.settings.theme.primaryColor}" />
          </div>

          <div class="setting-row">
            <label for="dark-mode">ダークモード</label>
            <label class="switch">
              <input type="checkbox" id="dark-mode" ${this.settings.theme.darkMode ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
        </section>

        <section class="settings-section">
          <h3 class="section-title">データ管理</h3>
          <button class="btn btn-danger" id="btn-reset-records">記録をすべてリセット</button>
        </section>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // 追加
    document.getElementById('btn-add-activity')?.addEventListener('click', () => this.showAddDialog());

    // 編集
    this.container.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        this.showEditDialog(id);
      });
    });

    // 削除
    this.container.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        const activity = this.activities.find((a) => a.id === id);
        if (confirm(`「${activity?.name}」を削除しますか？`)) {
          await database.deleteActivity(id);
          await this.render();
        }
      });
    });

    // テーマカラー
    document.getElementById('theme-color')?.addEventListener('change', async (e) => {
      this.settings.theme.primaryColor = (e.target as HTMLInputElement).value;
      await database.saveSettings(this.settings);
      applyTheme(this.settings.theme);
    });

    // ダークモード
    document.getElementById('dark-mode')?.addEventListener('change', async (e) => {
      this.settings.theme.darkMode = (e.target as HTMLInputElement).checked;
      await database.saveSettings(this.settings);
      applyTheme(this.settings.theme);
    });

    // 記録リセット
    document.getElementById('btn-reset-records')?.addEventListener('click', async () => {
      if (confirm('すべての記録データを削除しますか？\nこの操作は取り消せません。')) {
        await database.clearAllRecords();
        alert('記録をリセットしました');
        await this.render();
      }
    });
  }

  private showAddDialog(): void {
    this.showActivityDialog(null);
  }

  private showEditDialog(id: string): void {
    const activity = this.activities.find((a) => a.id === id);
    if (activity) {
      this.showActivityDialog(activity);
    }
  }

  private showActivityDialog(existing: Activity | null): void {
    const isEdit = existing !== null;
    const title = isEdit ? '行動を編集' : '行動を追加';

    // ダイアログ生成
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <h3 class="dialog-title">${title}</h3>
        <div class="dialog-body">
          <div class="form-group">
            <label>名前</label>
            <input type="text" id="dlg-name" value="${existing?.name ?? ''}" maxlength="20" placeholder="例: 勉強" />
          </div>
          <div class="form-group">
            <label>カラー</label>
            <input type="color" id="dlg-color" value="${existing?.color ?? '#6366f1'}" />
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-cancel" id="dlg-cancel">キャンセル</button>
          <button class="btn btn-confirm" id="dlg-confirm">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // イベント
    document.getElementById('dlg-cancel')?.addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.getElementById('dlg-confirm')?.addEventListener('click', async () => {
      const name = (document.getElementById('dlg-name') as HTMLInputElement).value.trim();
      const icon = '●';
      const color = (document.getElementById('dlg-color') as HTMLInputElement).value;

      if (!name) {
        alert('名前を入力してください');
        return;
      }

      if (isEdit && existing) {
        await database.updateActivity({ ...existing, name, icon, color });
      } else {
        const order = this.activities.length;
        await database.addActivity({ name, icon, color, order });
      }

      overlay.remove();
      await this.render();
    });
  }
}

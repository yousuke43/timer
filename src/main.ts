// ============================================================
// Entry Point
// ============================================================
import { App } from './app';
import './styles/main.css';

const app = new App();
app.init().catch((err) => {
  console.error('App initialization failed:', err);
  const el = document.getElementById('app');
  if (el) {
    el.innerHTML = `<div style="padding:2rem;text-align:center;color:red;">
      <p>アプリの起動に失敗しました</p>
      <p style="font-size:0.8rem;">${err.message}</p>
    </div>`;
  }
});

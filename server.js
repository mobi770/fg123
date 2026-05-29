// Family Guardian - Control Server
// Run this on a VPS or Netlify/Vercel serverless functions
// PORT: process.env.PORT or 3000

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve the web dashboard (embedded)
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Family Guardian – לוח בקרה</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');

:root {
  --bg: #070711;
  --surface: #0f0f1e;
  --surface2: #181830;
  --border: rgba(139,92,246,.15);
  --purple: #7c3aed;
  --purple-light: #a78bfa;
  --purple-glow: rgba(124,58,237,.3);
  --red: #ef4444;
  --green: #22c55e;
  --text: #e2e2f0;
  --text-dim: rgba(226,226,240,.45);
  --radius: 16px;
}

* { margin:0; padding:0; box-sizing:border-box; }

body {
  font-family: 'Heebo', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── Background effects ── */
.bg-mesh {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 60% 50% at 20% 20%, rgba(124,58,237,.12) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 80% 80%, rgba(79,70,229,.08) 0%, transparent 60%);
}
.bg-grid {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
  background-size: 32px 32px;
}

/* ── Layout ── */
.app { position: relative; z-index: 1; max-width: 680px; margin: 0 auto; padding: 24px 16px 60px; }

/* ── Header ── */
.header {
  text-align: center;
  margin-bottom: 32px;
  padding-top: 8px;
}
.logo { font-size: 3rem; margin-bottom: 8px; filter: drop-shadow(0 0 20px var(--purple-glow)); }
.header h1 {
  font-size: 2rem; font-weight: 900;
  background: linear-gradient(135deg, #a78bfa, #6d28d9);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  margin-bottom: 4px; letter-spacing: -1px;
}
.header p { color: var(--text-dim); font-size: .9rem; }

/* ── Connection status ── */
.conn-bar {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 24px; font-size: .8rem;
}
.conn-dot { width: 8px; height: 8px; border-radius: 50%; background: #374151; }
.conn-dot.connected { background: var(--green); box-shadow: 0 0 0 3px rgba(34,197,94,.2); }
.conn-dot.pulsing { animation: connPulse 1.5s ease-in-out infinite; }
@keyframes connPulse { 0%,100%{opacity:1}50%{opacity:.4} }

/* ── Cards ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 16px;
  overflow: hidden;
}
.card-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
}
.card-title { font-weight: 700; font-size: .95rem; display: flex; align-items: center; gap: 8px; }
.card-body { padding: 16px 20px; }

/* ── Global block ── */
.global-card {
  border-color: rgba(239,68,68,.2);
  background: rgba(239,68,68,.06);
  transition: all .3s;
}
.global-card.blocking {
  border-color: rgba(239,68,68,.5);
  background: rgba(239,68,68,.12);
  box-shadow: 0 0 0 1px rgba(239,68,68,.2), 0 8px 32px rgba(239,68,68,.1);
}
.global-inner {
  display: flex; align-items: center; gap: 16px; padding: 20px;
}
.global-icon { font-size: 2.5rem; transition: transform .3s; }
.global-card.blocking .global-icon { animation: shieldPulse 1.5s ease-in-out infinite; }
@keyframes shieldPulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.08)} }
.global-text h2 { font-size: 1.1rem; font-weight: 700; }
.global-text p { font-size: .82rem; color: var(--text-dim); margin-top: 2px; }
.global-card.blocking .global-text h2 { color: #f87171; }

/* ── Big toggle ── */
.big-toggle { position: relative; width: 64px; height: 34px; flex-shrink: 0; }
.big-toggle input { display: none; }
.big-toggle-track {
  position: absolute; inset: 0; border-radius: 17px;
  background: #1f2937; cursor: pointer; transition: background .25s;
  border: 2px solid rgba(255,255,255,.05);
}
.big-toggle input:checked + .big-toggle-track { background: #ef4444; border-color: transparent; }
.big-toggle-thumb {
  position: absolute;
  top: 4px; left: 4px;
  width: 26px; height: 26px;
  background: #fff; border-radius: 50%;
  transition: transform .25s cubic-bezier(.34,1.56,.64,1);
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(0,0,0,.4);
}
.big-toggle input:checked ~ .big-toggle-thumb { transform: translateX(30px); }

/* ── Sites ── */
.add-row { display: flex; gap: 8px; margin-bottom: 14px; }
.input {
  flex: 1; background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px; padding: 10px 14px;
  color: var(--text); font-size: .88rem; font-family: inherit;
  outline: none; direction: ltr; transition: border .2s;
}
.input:focus { border-color: var(--purple); }
.btn {
  padding: 10px 18px; border-radius: 12px; border: none;
  font-family: inherit; font-size: .88rem; font-weight: 600;
  cursor: pointer; transition: all .2s; white-space: nowrap;
}
.btn-primary { background: var(--purple); color: #fff; }
.btn-primary:hover { background: #6d28d9; transform: translateY(-1px); }
.btn-sm { padding: 6px 12px; font-size: .8rem; border-radius: 9px; }
.btn-ghost { background: rgba(255,255,255,.07); color: var(--text-dim); }
.btn-ghost:hover { background: rgba(255,255,255,.12); color: var(--text); }
.btn-danger { background: rgba(239,68,68,.12); color: #f87171; }
.btn-danger:hover { background: rgba(239,68,68,.25); }

/* ── Site item ── */
.site-item {
  background: var(--surface2);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 14px;
  margin-bottom: 10px; transition: border .2s;
}
.site-item:hover { border-color: rgba(124,58,237,.25); }
.site-row1 { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.site-domain-wrap { display: flex; align-items: center; gap: 8px; }
.site-dot { width: 8px; height: 8px; border-radius: 50%; background: #374151; }
.site-dot.active { background: var(--green); }
.site-domain { font-size: .92rem; font-weight: 600; direction: ltr; }
.site-row1-right { display: flex; align-items: center; gap: 8px; }

/* Mini toggle */
.mini-toggle { position: relative; width: 44px; height: 24px; }
.mini-toggle input { display: none; }
.mini-toggle-track {
  position: absolute; inset: 0; border-radius: 12px;
  background: #1f2937; cursor: pointer; transition: background .2s;
}
.mini-toggle input:checked + .mini-toggle-track { background: var(--green); }
.mini-toggle-thumb {
  position: absolute;
  top: 3px; left: 3px;
  width: 18px; height: 18px;
  background: #fff; border-radius: 50%;
  transition: transform .2s cubic-bezier(.34,1.56,.64,1);
  pointer-events: none;
  box-shadow: 0 1px 4px rgba(0,0,0,.4);
}
.mini-toggle input:checked ~ .mini-toggle-thumb { transform: translateX(20px); }

/* Schedule selector */
.sched-pills { display: flex; gap: 5px; margin-bottom: 10px; }
.pill {
  flex: 1; padding: 6px 4px; text-align: center;
  border-radius: 9px; font-size: .76rem; font-weight: 600;
  cursor: pointer; transition: all .15s;
  background: rgba(255,255,255,.05); color: var(--text-dim);
  border: 1px solid transparent;
  user-select: none;
}
.pill.active { background: rgba(124,58,237,.2); color: var(--purple-light); border-color: rgba(124,58,237,.35); }

/* Time windows */
.time-windows-wrap { margin-top: 6px; }
.tw-label { font-size: .75rem; color: var(--text-dim); margin-bottom: 7px; }
.tw-row { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
.tw-row input[type=time] {
  flex: 1; background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 9px; padding: 6px 9px;
  color: var(--text); font-size: .82rem;
  outline: none; direction: ltr;
}
.tw-row input[type=time]:focus { border-color: var(--purple); }
.tw-sep { color: var(--text-dim); font-size: .8rem; white-space: nowrap; }
.btn-remove-win { background: none; border: none; cursor: pointer; font-size: .95rem; opacity: .5; padding: 2px 4px; }
.btn-remove-win:hover { opacity: 1; }
.btn-add-win {
  width: 100%; border: 1px dashed rgba(124,58,237,.3);
  background: none; color: #7c3aed; border-radius: 9px;
  padding: 7px; font-size: .8rem; font-family: inherit;
  cursor: pointer; transition: all .2s;
}
.btn-add-win:hover { background: rgba(124,58,237,.1); }

/* Empty state */
.empty { text-align: center; padding: 28px; color: var(--text-dim); font-size: .88rem; }
.empty-icon { font-size: 2rem; margin-bottom: 8px; opacity: .5; }

/* ── Last sync info ── */
.sync-info { font-size: .75rem; color: var(--text-dim); text-align: center; margin-top: -8px; margin-bottom: 16px; }

/* ── Save button ── */
.save-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: rgba(7,7,17,.9); backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  padding: 12px 16px; z-index: 100;
  display: flex; gap: 8px; justify-content: center;
  transform: translateY(100%); transition: transform .3s;
}
.save-bar.visible { transform: translateY(0); }

/* ── Toast ── */
.toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-80px);
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 100px; padding: 10px 20px;
  font-size: .85rem; font-weight: 600; z-index: 200;
  transition: transform .3s cubic-bezier(.34,1.56,.64,1);
  white-space: nowrap;
}
.toast.show { transform: translateX(-50%) translateY(0); }
.toast.success { border-color: rgba(34,197,94,.3); color: #4ade80; }
.toast.error { border-color: rgba(239,68,68,.3); color: #f87171; }

/* ── Settings ── */
.server-setting { margin-bottom: 12px; }
.setting-label { font-size: .8rem; color: var(--text-dim); margin-bottom: 5px; }
.setting-hint { font-size: .75rem; color: rgba(124,58,237,.7); margin-top: 4px; }

/* Responsive */
@media (max-width: 480px) {
  .app { padding: 16px 12px 70px; }
  .header h1 { font-size: 1.6rem; }
  .global-inner { flex-wrap: wrap; }
}
</style>
</head>
<body>
<div class="bg-mesh"></div>
<div class="bg-grid"></div>

<div class="app">
  <!-- Header -->
  <div class="header">
    <div class="logo">🛡️</div>
    <h1>Family Guardian</h1>
    <p>לוח בקרה משפחתי</p>
  </div>

  <!-- Connection bar -->
  <div class="conn-bar">
    <div class="conn-dot pulsing" id="connDot"></div>
    <span id="connText">מתחבר...</span>
  </div>

  <!-- Global Block Card -->
  <div class="card global-card" id="globalCard">
    <div class="global-inner">
      <div class="global-icon" id="globalIcon">🌐</div>
      <div class="global-text" style="flex:1">
        <h2 id="globalTitle">חסימת אינטרנט כללית</h2>
        <p id="globalDesc">כשפעיל – חוסם גישה לכל האינטרנט</p>
      </div>
      <label class="big-toggle">
        <input type="checkbox" id="globalToggle">
        <div class="big-toggle-track"></div>
        <div class="big-toggle-thumb"></div>
      </label>
    </div>
  </div>

  <!-- Sites Card -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">📋 רשימת אתרים מוגבלים</div>
      <div id="siteCount" style="font-size:.8rem;color:var(--text-dim)">0 אתרים</div>
    </div>
    <div class="card-body">
      <div class="add-row">
        <input class="input" type="text" id="newDomain" placeholder="youtube.com" dir="ltr">
        <button class="btn btn-primary" onclick="addSite()">➕ הוסף</button>
      </div>
      <div id="siteList"></div>
    </div>
  </div>

  <!-- Log Card -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">📜 יומן גלישה</div>
      <button class="btn btn-sm btn-danger" onclick="clearServerLog()" style="font-size:.75rem;padding:5px 10px">🗑️ נקה</button>
    </div>
    <div class="card-body" style="padding:12px 16px">
      <div id="logListDash" style="max-height:320px;overflow-y:auto"></div>
    </div>
  </div>

  <!-- Server Settings Card -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">⚙️ הגדרות שרת</div>
    </div>
    <div class="card-body">
      <div class="server-setting">
        <div class="setting-label">כתובת השרת הזה (להגדרה בתוסף)</div>
        <input class="input" type="text" id="serverUrlDisplay" readonly dir="ltr" style="cursor:pointer;background:rgba(124,58,237,.08);border-color:rgba(124,58,237,.2)" onclick="copyServerUrl()">
        <div class="setting-hint">📋 לחץ להעתקה → הדבק בתוסף הכרום</div>
      </div>
      <div style="font-size:.8rem;color:var(--text-dim);line-height:1.7;margin-top:8px;padding:12px;background:rgba(255,255,255,.03);border-radius:10px;">
        <strong style="color:var(--text)">הוראות הפעלה:</strong><br>
        1. העתק את כתובת השרת למעלה<br>
        2. פתח את תוסף Family Guardian בכרום<br>
        3. לחץ "הגדרות" → הדבק את הכתובת → שמור<br>
        4. כעת שינויים מהאתר הזה יסונכרנו לתוסף תוך דקה
      </div>
    </div>
  </div>

</div><!-- /app -->

<!-- Save bar -->
<div class="save-bar" id="saveBar">
  <button class="btn btn-ghost" onclick="discardChanges()">↩️ בטל</button>
  <button class="btn btn-primary" onclick="saveChanges()" id="saveBtn">💾 שמור שינויים</button>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
// ── State ──────────────────────────────────────────────────────────────────────
let config = { sites: [], globalBlock: false };
let savedConfig = null;
let dirty = false;
const SERVER = window.location.origin; // same origin as dashboard

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  document.getElementById('serverUrlDisplay').value = window.location.origin;
  await fetchConfig();
  setInterval(fetchConfig, 30000); // auto-refresh every 30s
  fetchLog();
  setInterval(fetchLog, 30000);
}

async function fetchConfig() {
  try {
    const res = await fetch(\`\${SERVER}/api/config\`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!dirty) { // don't overwrite unsaved local changes
      config = data;
      savedConfig = JSON.parse(JSON.stringify(data));
    }
    setConnected(true);
    renderAll();
  } catch (e) {
    setConnected(false);
  }
}

function setConnected(ok) {
  const dot = document.getElementById('connDot');
  const text = document.getElementById('connText');
  if (ok) {
    dot.className = 'conn-dot connected';
    text.textContent = 'מחובר לשרת';
  } else {
    dot.className = 'conn-dot pulsing';
    text.textContent = 'מנסה להתחבר...';
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderAll() {
  renderGlobal();
  renderSites();
}

function renderGlobal() {
  const toggle = document.getElementById('globalToggle');
  const card = document.getElementById('globalCard');
  const icon = document.getElementById('globalIcon');
  const title = document.getElementById('globalTitle');
  const desc = document.getElementById('globalDesc');

  toggle.checked = config.globalBlock;
  card.classList.toggle('blocking', config.globalBlock);

  if (config.globalBlock) {
    icon.textContent = '🚫';
    title.textContent = 'אינטרנט חסום!';
    desc.textContent = 'כל הגלישה חסומה כרגע';
  } else {
    icon.textContent = '🌐';
    title.textContent = 'חסימת אינטרנט כללית';
    desc.textContent = 'כשפעיל – חוסם גישה לכל האינטרנט';
  }
}

function renderSites() {
  const list = document.getElementById('siteList');
  document.getElementById('siteCount').textContent = config.sites.length + ' אתרים';

  if (!config.sites.length) {
    list.innerHTML = \`<div class="empty"><div class="empty-icon">📭</div>אין אתרים ברשימה<br>הוסף אתר לחסימה מעל</div>\`;
    return;
  }

  list.innerHTML = config.sites.map((site, i) => renderSiteItem(site, i)).join('');
  attachEvents();
}

function renderSiteItem(site, i) {
  const isActive = site.enabled && site.scheduleType !== 'never';
  const windowsHtml = (site.timeWindows || []).map((w, wi) => \`
    <div class="tw-row">
      <input type="time" class="tw-start" value="\${w.start}" data-i="\${i}" data-wi="\${wi}">
      <span class="tw-sep">עד</span>
      <input type="time" class="tw-end" value="\${w.end}" data-i="\${i}" data-wi="\${wi}">
      <button class="btn-remove-win" onclick="removeWindow(\${i},\${wi})">🗑️</button>
    </div>
  \`).join('');

  return \`
    <div class="site-item">
      <div class="site-row1">
        <div class="site-domain-wrap">
          <div class="site-dot \${isActive ? 'active' : ''}"></div>
          <div class="site-domain">\${site.domain}</div>
        </div>
        <div class="site-row1-right">
          <label class="mini-toggle">
            <input type="checkbox" class="site-enabled" data-i="\${i}" \${site.enabled ? 'checked' : ''}>
            <div class="mini-toggle-track"></div>
            <div class="mini-toggle-thumb"></div>
          </label>
          <button class="btn btn-sm btn-danger" onclick="removeSite(\${i})">הסר</button>
        </div>
      </div>
      <div class="sched-pills">
        <div class="pill \${site.scheduleType==='time_windows'?'active':''}" data-i="\${i}" data-t="time_windows">🕐 לפי שעות</div>
        <div class="pill \${site.scheduleType==='always'?'active':''}" data-i="\${i}" data-t="always">🚫 תמיד חסום</div>
        <div class="pill \${site.scheduleType==='never'?'active':''}" data-i="\${i}" data-t="never">✅ תמיד פתוח</div>
      </div>
      \${site.scheduleType === 'time_windows' ? \`
        <div class="time-windows-wrap">
          <div class="tw-label">✅ גישה מותרת בשעות הבאות (בשאר הזמן – חסום):</div>
          \${windowsHtml}
          <button class="btn-add-win" onclick="addWindow(\${i})">＋ הוסף טווח שעות נוסף</button>
        </div>
      \` : ''}
    </div>
  \`;
}

function attachEvents() {
  // Enable toggles
  document.querySelectorAll('.site-enabled').forEach(el => {
    el.addEventListener('change', (e) => {
      config.sites[+el.dataset.i].enabled = e.target.checked;
      markDirty(); renderSites();
    });
  });
  // Schedule pills
  document.querySelectorAll('.pill').forEach(el => {
    el.addEventListener('click', () => {
      const i = +el.dataset.i, t = el.dataset.t;
      config.sites[i].scheduleType = t;
      if (t === 'time_windows' && (!config.sites[i].timeWindows || !config.sites[i].timeWindows.length)) {
        config.sites[i].timeWindows = [{ start: '08:00', end: '22:00' }];
      }
      markDirty(); renderSites();
    });
  });
  // Time inputs
  document.querySelectorAll('.tw-start, .tw-end').forEach(el => {
    el.addEventListener('change', () => {
      const i = +el.dataset.i, wi = +el.dataset.wi;
      if (el.classList.contains('tw-start')) config.sites[i].timeWindows[wi].start = el.value;
      else config.sites[i].timeWindows[wi].end = el.value;
      markDirty();
    });
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────
document.getElementById('globalToggle').addEventListener('change', async (e) => {
  config.globalBlock = e.target.checked;
  renderGlobal();
  // Immediate save for global block (safety feature)
  try {
    await fetch(\`\${SERVER}/api/global-block\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: config.globalBlock })
    });
    toast(config.globalBlock ? '🚫 אינטרנט חסום!' : '✅ אינטרנט פתוח', config.globalBlock ? 'error' : 'success');
  } catch (e) {
    toast('שגיאה בשמירה', 'error');
  }
  dirty = false;
  document.getElementById('saveBar').classList.remove('visible');
});

function addSite() {
  let domain = document.getElementById('newDomain').value.trim()
    .replace(/^https?:\\/\\//, '').replace(/\\/.*$/, '').toLowerCase();
  if (!domain) return;
  if (config.sites.some(s => s.domain === domain)) { toast('האתר כבר ברשימה', 'error'); return; }
  config.sites.push({ domain, enabled: true, scheduleType: 'time_windows', timeWindows: [{ start: '08:00', end: '22:00' }] });
  document.getElementById('newDomain').value = '';
  markDirty(); renderSites();
}

function removeSite(i) {
  config.sites.splice(i, 1);
  markDirty(); renderSites();
}

function addWindow(i) {
  if (!config.sites[i].timeWindows) config.sites[i].timeWindows = [];
  config.sites[i].timeWindows.push({ start: '12:00', end: '13:00' });
  markDirty(); renderSites();
}

function removeWindow(i, wi) {
  config.sites[i].timeWindows.splice(wi, 1);
  markDirty(); renderSites();
}

async function saveChanges() {
  const btn = document.getElementById('saveBtn');
  btn.textContent = '💾 שומר...'; btn.disabled = true;
  try {
    const res = await fetch(\`\${SERVER}/api/config\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error('failed');
    savedConfig = JSON.parse(JSON.stringify(config));
    dirty = false;
    document.getElementById('saveBar').classList.remove('visible');
    toast('✅ שמור! יסונכרן לתוסף תוך דקה', 'success');
  } catch (e) {
    toast('❌ שגיאה בשמירה', 'error');
  } finally {
    btn.textContent = '💾 שמור שינויים'; btn.disabled = false;
  }
}

function discardChanges() {
  config = JSON.parse(JSON.stringify(savedConfig));
  dirty = false;
  document.getElementById('saveBar').classList.remove('visible');
  renderAll();
}

function markDirty() {
  dirty = true;
  document.getElementById('saveBar').classList.add('visible');
}

function copyServerUrl() {
  const val = document.getElementById('serverUrlDisplay').value;
  navigator.clipboard.writeText(val).then(() => toast('📋 הועתק!', 'success'));
}

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = \`toast \${type} show\`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
</script>
</body>
</html>
`;
app.get('/', (req, res) => res.send(DASHBOARD_HTML));

// ── Data Storage (simple JSON file) ──────────────────────────────────────────
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    sites: [],
    globalBlock: false,
    updatedAt: new Date().toISOString()
  };
}

function saveData(data) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── API Routes ────────────────────────────────────────────────────────────────

// GET /api/config - Extension polls this
app.get('/api/config', (req, res) => {
  const data = loadData();
  res.json(data);
});

// POST /api/config - Extension pushes updates OR dashboard updates
app.post('/api/config', (req, res) => {
  const current = loadData();
  const updated = {
    ...current,
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  saveData(updated);
  res.json({ ok: true, data: updated });
});

// PATCH /api/global-block - Quick toggle from dashboard
app.patch('/api/global-block', (req, res) => {
  const data = loadData();
  data.globalBlock = req.body.value;
  saveData(data);
  res.json({ ok: true, globalBlock: data.globalBlock });
});

// GET /api/status - Dashboard heartbeat
app.get('/api/status', (req, res) => {
  const data = loadData();
  res.json({
    ok: true,
    globalBlock: data.globalBlock,
    sitesCount: data.sites.length,
    updatedAt: data.updatedAt
  });
});

// ── Log Routes ───────────────────────────────────────────────────────────────
const LOG_FILE = path.join(__dirname, 'log.json');

function loadLog() {
  try {
    if (fs.existsSync(LOG_FILE)) return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch (e) {}
  return [];
}
function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log.slice(0, 500), null, 2));
}

app.get('/api/log', (req, res) => res.json(loadLog()));

app.post('/api/log', (req, res) => {
  const log = loadLog();
  const entries = Array.isArray(req.body) ? req.body : [req.body];
  entries.forEach(e => log.unshift(e));
  saveLog(log);
  res.json({ ok: true });
});

app.delete('/api/log', (req, res) => {
  saveLog([]);
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🛡️  Family Guardian Server running on port ${PORT}`);
  console.log(`📱 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api/config\n`);
});

module.exports = app;

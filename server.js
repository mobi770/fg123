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

// Serve the web dashboard
app.use(express.static(path.join(__dirname, '../web-dashboard')));

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

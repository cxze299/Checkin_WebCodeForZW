const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 6717);
const host = process.env.HOST || '0.0.0.0';
const staticDir = path.resolve(process.env.STATIC_DIR || __dirname);
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const recordsPath = path.join(dataDir, 'records.json');

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'zw-checkin' });
});

app.get('/api/state', (req, res) => {
  const records = readJsonFile(recordsPath, []);
  res.json({ records });
});

app.use((req, res, next) => {
  if (/\.(html|md|json)$/i.test(req.path)) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use(express.static(staticDir, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (/\.(html|md|json)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`ZW checkin is running at http://${host}:${port}`);
  console.log(`Serving static files from ${staticDir}`);
});

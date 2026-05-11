const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 6717);
const host = process.env.HOST || '0.0.0.0';
const staticDir = path.resolve(process.env.STATIC_DIR || __dirname);
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const recordsPath = path.join(dataDir, 'records.json');
const weeklySchedulePath = path.join(dataDir, 'weekly-schedule.json');
const testimonialsPath = path.join(dataDir, 'testimonials.json');
const backupDir = path.join(dataDir, 'backups');

const defaultWeeklySchedule = [
  { start: '2026-04-13', end: '2026-04-18', title: '永活之泉', verse: '约翰福音17:1-2', video: '', url: '' },
  { start: '2026-04-20', end: '2026-04-25', title: '永活之泉', verse: '约翰福音17:3-5', video: '', url: '' },
  { start: '2026-04-27', end: '2026-05-02', title: '永活之泉', verse: '约翰福音17:6-8', video: '', url: '' },
  { start: '2026-05-04', end: '2026-05-09', title: '永活之泉', verse: '约翰福音17:9-10', video: '', url: '' },
  { start: '2026-05-11', end: '2026-05-16', title: '永活之泉', verse: '约翰福音17:11-12', video: '四福音合参（上）', url: '' },
  { start: '2026-05-18', end: '2026-05-23', title: '永活之泉', verse: '约翰福音17:13-14', video: '四福音合参（下）', url: '' },
  { start: '2026-05-25', end: '2026-05-30', title: '永活之泉', verse: '约翰福音17:15-16', video: '马太福音（上）、基督是我们的王（基督的启示—王的受浸）', url: '' },
  { start: '2026-06-01', end: '2026-06-06', title: '永活之泉', verse: '约翰福音17:17-18', video: '马太福音（下）、基督是我们的王（呼召门徒—十字架的记号）', url: '' },
  { start: '2026-06-08', end: '2026-06-13', title: '永活之泉', verse: '约翰福音17:19-20', video: '马可福音（上）、基督是神的仆人（小引—事奉的性质）', url: '' },
  { start: '2026-06-15', end: '2026-06-20', title: '永活之泉', verse: '约翰福音17:21-22', video: '马可福音（下）、基督是神的仆人（事奉的性格）', url: '' },
  { start: '2026-06-22', end: '2026-06-27', title: '永活之泉', verse: '约翰福音17:23-24', video: '路加福音（上）、基督是人子（神所爱的人—主耶稣的成长）', url: '' },
  { start: '2026-06-29', end: '2026-07-04', title: '永活之泉', verse: '约翰福音17:25-26', video: '路加福音（下）、基督是人子（主耶稣的工作—主耶稣的人格）', url: '' },
  { start: '2026-07-06', end: '2026-07-11', title: '永活之泉', verse: '', video: '约翰福音（上）、基督是神的儿子（神儿子的生命—真理-光）', url: '' },
  { start: '2026-07-13', end: '2026-07-18', title: '永活之泉', verse: '', video: '约翰福音（下）、基督是神的儿子（赐给我们的生命）', url: '' }
];

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));

app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ======================= 数据持久化基础工具 =======================

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function writeJsonFile(filePath, value) {
  ensureDataDir();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function backupFileIfExists(filePath, label) {
  if (!fs.existsSync(filePath)) return;
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${label}-${timestampForFile()}.json`);
  fs.copyFileSync(filePath, backupPath);
}

function writeDataJsonFile(filePath, value, backupLabel) {
  backupFileIfExists(filePath, backupLabel);
  writeJsonFile(filePath, value);
}

// ======================= 打卡记录与安全性 =======================

function assertRecordsWriteSafe(nextRecords, options = {}) {
  if (!Array.isArray(nextRecords)) {
    const error = new Error('Refusing to write records.json: next records is not an array');
    error.statusCode = 500;
    throw error;
  }

  if (!fs.existsSync(recordsPath)) return;

  const currentRecords = readJsonFile(recordsPath, []);
  if (!Array.isArray(currentRecords)) return;
  if (options.allowShrink === true) return;

  const currentCount = currentRecords.length;
  const nextCount = nextRecords.length;
  if (currentCount > 0 && nextCount < currentCount) {
    const error = new Error(`Refusing to shrink records.json from ${currentCount} to ${nextCount} records`);
    error.statusCode = 409;
    throw error;
  }
}

function writeRecordsJsonFile(nextRecords, backupLabel = 'records', options = {}) {
  assertRecordsWriteSafe(nextRecords, options);
  writeDataJsonFile(recordsPath, nextRecords, backupLabel);
}

function assertRecordsPersisted(savedRecords) {
  const persistedRecords = readJsonFile(recordsPath, []);
  const persistedIds = new Set(persistedRecords.map((record) => String(record && record.Id)));
  const missingIds = savedRecords
    .map((record) => record && record.Id)
    .filter((id) => id !== undefined && id !== null)
    .filter((id) => !persistedIds.has(String(id)));

  if (missingIds.length > 0) {
    throw new Error(`Records were not persisted to JSON: ${missingIds.join(', ')}`);
  }
}

function normalizeRecords(input) {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object') return [input];
  return [];
}

// ======================= 周任务处理 =======================

function normalizeWeekPlan(plan) {
  if (!plan || typeof plan !== 'object') return null;
  const normalized = {
    start: String(plan.start || '').trim(),
    end: String(plan.end || '').trim(),
    title: String(plan.title || '').trim(),
    verse: String(plan.verse || '').trim(),
    video: String(plan.video || '').trim(),
    url: String(plan.url || plan.videoUrl || '').trim()
  };
  return normalized.start && normalized.end && normalized.title ? normalized : null;
}

function normalizeWeeklySchedule(input) {
  const source = Array.isArray(input) ? input : [];
  return source
    .map(normalizeWeekPlan)
    .filter(Boolean)
    .sort((a, b) => a.start.localeCompare(b.start));
}

function readWeeklySchedule() {
  const saved = normalizeWeeklySchedule(readJsonFile(weeklySchedulePath, []));
  if (saved.length > 0) return saved;
  const defaults = normalizeWeeklySchedule(defaultWeeklySchedule);
  writeJsonFile(weeklySchedulePath, defaults);
  return defaults;
}

function writeWeeklySchedule(schedule) {
  const normalized = normalizeWeeklySchedule(schedule);
  if (normalized.length === 0) {
    const error = new Error('Weekly schedule is empty');
    error.statusCode = 400;
    throw error;
  }
  writeDataJsonFile(weeklySchedulePath, normalized, 'weekly-schedule');
  return normalized;
}

// ======================= 个人得着（Testimonial）处理 =======================

function normalizeTestimonial(item, index = 0) {
  if (!item || typeof item !== 'object') return null;
  const name = String(item.name || item['姓名'] || '').trim();
  const content = String(item.content || item.message || item['感言'] || item['留言'] || '').trim();
  if (!name || !content) return null;
  const id = Number(item.id || item.Id || index + 1);
  return {
    id: Number.isFinite(id) ? id : index + 1,
    name,
    content,
    date: String(item.date || item['日期'] || new Date().toISOString().slice(0, 10)).slice(0, 10),
    createdAt: String(item.createdAt || item['创建时间'] || new Date().toISOString())
  };
}

function readTestimonials() {
  const raw = readJsonFile(testimonialsPath, []);
  return Array.isArray(raw)
    ? raw.map(normalizeTestimonial).filter(Boolean)
    : [];
}

function createTestimonial(item) {
  const testimonials = readTestimonials();
  const nextId = testimonials.reduce((maxId, entry) => Math.max(maxId, Number(entry.id) || 0), 0) + 1;
  const normalized = normalizeTestimonial({ ...item, id: nextId, createdAt: new Date().toISOString() });
  if (!normalized) {
    const error = new Error('Name and content are required');
    error.statusCode = 400;
    throw error;
  }
  const nextTestimonials = testimonials.concat(normalized);
  writeDataJsonFile(testimonialsPath, nextTestimonials, 'testimonials');
  return normalized;
}

// ======================= 核心业务引擎：纯本地 JSON 模式 =======================

function nextRecordId(records) {
  return records.reduce((maxId, record) => {
    const numericId = Number(record && record.Id);
    return Number.isFinite(numericId) ? Math.max(maxId, numericId) : maxId;
  }, 0) + 1;
}

function getStorageInfo(extra = {}) {
  return {
    mode: 'json',
    label: 'NAS 本地文件系统 (Pure JSON)',
    ...extra
  };
}

async function readRecords() {
  // 直接读取本地 records.json
  return { records: readJsonFile(recordsPath, []), storage: getStorageInfo() };
}

async function createRecords(incomingRecords) {
  // 追加记录并生成自增 ID
  const records = readJsonFile(recordsPath, []);
  let nextId = nextRecordId(records);
  const savedRecords = incomingRecords.map((record) => ({
    ...record,
    Id: record.Id || nextId++
  }));

  writeRecordsJsonFile(records.concat(savedRecords), 'records');
  assertRecordsPersisted(savedRecords);
  return savedRecords;
}

async function deleteRecords(recordsToDelete) {
  // 根据 ID 删除记录
  const ids = recordsToDelete
    .map((record) => record && record.Id)
    .filter((id) => id !== undefined && id !== null)
    .map(String);

  if (ids.length === 0) {
    const error = new Error('No record ids provided');
    error.statusCode = 400;
    throw error;
  }

  const idSet = new Set(ids);
  const records = readJsonFile(recordsPath, []);
  const nextRecords = records.filter((record) => !idSet.has(String(record && record.Id)));
  
  writeRecordsJsonFile(nextRecords, 'records', { allowShrink: true });
  return records.length - nextRecords.length;
}

// ======================= Express 路由控制 =======================

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'zw-checkin-pure-json' });
});

app.get('/api/state', async (req, res) => {
  try {
    const { records, storage } = await readRecords();
    res.json({ records, weeklySchedule: readWeeklySchedule(), testimonials: readTestimonials(), storage, ok: true });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message, storage: getStorageInfo({ status: 'error' }) });
  }
});

app.get('/api/weekly-schedule', (req, res) => {
  try {
    res.json({ ok: true, weeklySchedule: readWeeklySchedule() });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message });
  }
});

app.put('/api/weekly-schedule', (req, res) => {
  try {
    const incoming = Array.isArray(req.body) ? req.body : req.body.weeklySchedule;
    res.json({ ok: true, weeklySchedule: writeWeeklySchedule(incoming) });
  } catch (error) {
    res.status(error.statusCode || 502).json({ ok: false, error: error.message });
  }
});

app.get('/api/testimonials', (req, res) => {
  try {
    const name = String(req.query.name || '').trim();
    const testimonials = readTestimonials()
      .filter(item => !name || item.name === name)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({ ok: true, testimonials });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message });
  }
});

app.post('/api/testimonials', (req, res) => {
  try {
    res.status(201).json({ ok: true, testimonial: createTestimonial(req.body) });
  } catch (error) {
    res.status(error.statusCode || 502).json({ ok: false, error: error.message });
  }
});

app.post('/api/records', async (req, res) => {
  const incomingRecords = normalizeRecords(req.body);
  if (incomingRecords.length === 0) {
    return res.status(400).json({ ok: false, error: 'No records provided' });
  }

  try {
    const savedRecords = await createRecords(incomingRecords);
    res.status(201).json({ ok: true, records: savedRecords, storage: getStorageInfo() });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message, storage: getStorageInfo({ status: 'error' }) });
  }
});

app.delete('/api/records', async (req, res) => {
  try {
    const deleted = await deleteRecords(normalizeRecords(req.body));
    res.json({ ok: true, deleted, storage: getStorageInfo() });
  } catch (error) {
    res.status(error.statusCode || 502).json({ ok: false, error: error.message, storage: getStorageInfo({ status: 'error' }) });
  }
});

// 静态文件与缓存控制
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
  console.log(`ZW checkin (Pure Local JSON Mode) is running at http://${host}:${port}`);
  console.log(`Serving static files from ${staticDir}`);
  console.log(`Saving data to ${dataDir}`);
});
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '.env'));

const apiUrl = process.env.NOCODB_API_URL || 'http://mouss.synology.me:32771/api/v2/tables/md6q8riiyslkw6p/records';
const apiToken = process.env.NOCODB_API_TOKEN || process.env.API_TOKEN || 'awAGCSLcP-P-ABUja1yMxNopjD_cX4OnfbKO2cR0';
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const recordsPath = path.join(dataDir, 'records.json');
const databasePath = path.resolve(process.env.DATABASE_PATH || path.join(dataDir, 'app.json'));
const backupDir = path.join(dataDir, 'backups');
const defaultMembers = ['迦密', '恩惠', '以琳', '陈蜜', '诚志', '信凯', '周睿', '家乐', '可心', '佳音', '李好', '文琪', '奕豪', '爱赐', '梓楠', '思恩', '浙君', '丹萍', '天宇', '恩悯', '翠翠', '慕智', '蒙恩', '贝贝'];

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function normalizeRecord(record, index) {
  const id = Number(record.Id || record.id || record.ID || index + 1);
  const checkinTime = record['打卡时间'] || record.checkinTime || record.checkin_time || record.CreatedAt || record.created_at || new Date().toISOString();
  const logicalDate = record['逻辑日期'] || record.logicalDate || record.logical_date || record.date || String(checkinTime).slice(0, 10);
  return {
    Id: Number.isFinite(id) ? id : index + 1,
    '姓名': String(record['姓名'] || record.name || record.Name || '').trim(),
    '打卡时间': String(checkinTime),
    '逻辑日期': String(logicalDate).slice(0, 10),
    '是否补签': record['是否补签'] || record.isRetro || record.is_retro || '否',
    '每日灵修': record['每日灵修'] || record.daily || null,
    '每日读经': record['每日读经'] || record.reading || null,
    '周任务': record['周任务'] || record.weekly || null,
    '打卡详情': record['打卡详情'] || record.detail || record.Description || ''
  };
}

function recordKey(record) {
  return [
    String(record['姓名'] || '').trim(),
    String(record['逻辑日期'] || '').trim(),
    String(record['打卡时间'] || '').trim(),
    String(record['每日灵修'] || ''),
    String(record['每日读经'] || ''),
    String(record['周任务'] || ''),
    String(record['打卡详情'] || '')
  ].join('|');
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function backupFileIfExists(filePath, label) {
  if (!fs.existsSync(filePath)) return;
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(filePath, path.join(backupDir, `${label}-${timestampForFile()}.json`));
}

function countUniqueRecords(records) {
  const seen = new Set();
  for (const record of records) {
    const key = recordKey(record);
    if (key) seen.add(key);
  }
  return seen.size;
}

async function fetchAllRecords() {
  const records = [];
  let offset = 0;
  const limit = Number(process.env.NOCODB_PAGE_SIZE || 1000);

  while (true) {
    const url = new URL(apiUrl);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('_t', String(Date.now()));

    const response = await fetch(url, {
      headers: {
        'xc-token': apiToken,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`NocoDB request failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    const list = Array.isArray(data.list) ? data.list : [];
    records.push(...list);

    if (list.length < limit) break;
    offset += limit;
  }

  return records;
}

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });
  const records = await fetchAllRecords();
  const normalizedRecords = records.map(normalizeRecord).filter(record => record && record['姓名']);
  const existingStore = readJsonFile(databasePath, {});
  const existingRecordsFile = readJsonFile(recordsPath, []);
  const existingStoreRecords = Array.isArray(existingStore.records) ? existingStore.records : [];
  const existingFileRecords = Array.isArray(existingRecordsFile) ? existingRecordsFile : [];
  const existingRecords = [...existingFileRecords, ...existingStoreRecords]
    .map(normalizeRecord)
    .filter(record => record && record['姓名']);
  const mergedRecords = [];
  const seen = new Set();
  for (const record of [...existingRecords, ...normalizedRecords]) {
    const key = recordKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    mergedRecords.push(record);
  }
  const existingUniqueCount = countUniqueRecords(existingRecords);
  if (existingUniqueCount > 0 && mergedRecords.length < existingUniqueCount) {
    throw new Error(`Refusing to write imported records: merged count ${mergedRecords.length} is less than existing unique count ${existingUniqueCount}`);
  }
  const nextStore = {
    settings: existingStore.settings && typeof existingStore.settings === 'object' ? existingStore.settings : {},
    members: Array.isArray(existingStore.members) && existingStore.members.length
      ? existingStore.members
      : defaultMembers.map((name, index) => ({ name, sort_order: index, active: 1 })),
    weeklySchedule: Array.isArray(existingStore.weeklySchedule) ? existingStore.weeklySchedule : [],
    records: mergedRecords
  };
  backupFileIfExists(databasePath, 'app-before-nocodb-import');
  backupFileIfExists(recordsPath, 'records-before-nocodb-import');
  fs.writeFileSync(databasePath, JSON.stringify(nextStore, null, 2), 'utf8');
  fs.writeFileSync(recordsPath, JSON.stringify(mergedRecords, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(dataDir, 'nocodb-import-meta.json'),
    JSON.stringify({ importedAt: new Date().toISOString(), count: mergedRecords.length, source: apiUrl, importedFromNocodb: normalizedRecords.length, preservedLocal: existingRecords.length }, null, 2),
    'utf8'
  );
  console.log(`Imported ${normalizedRecords.length} NocoDB records and preserved ${existingRecords.length} local records to ${databasePath}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});

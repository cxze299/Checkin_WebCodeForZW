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
  fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(dataDir, 'nocodb-import-meta.json'),
    JSON.stringify({ importedAt: new Date().toISOString(), count: records.length, source: apiUrl }, null, 2),
    'utf8'
  );
  console.log(`Imported ${records.length} records to ${recordsPath}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});

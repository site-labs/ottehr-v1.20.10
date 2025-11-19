#!/usr/bin/env node
// Usage: node delete-prefixed-zambdas.js --prefix=my-prefix [--dry-run]

const fetch = globalThis.fetch || require('node-fetch');
const path = require('path');
const fs = require('fs');

// load env fallback like existing scripts
let fileEnv = {};
try {
  const envPath = path.resolve(__dirname, '../../', '.env', `${process.env.ENV || 'local'}.json`);
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    fileEnv = JSON.parse(raw || '{}');
  }
} catch (err) {
  // ignore
}

const BASE_URL = (process.env.PROJECT_API || fileEnv.PROJECT_API || 'https://project-api.zapehr.com').replace(/\/v1\/?$/, '');
const TOKEN = ((process.env.PROJECT_ACCESS_TOKEN || fileEnv.PROJECT_ACCESS_TOKEN) + '').replace(/^"|"$/g, '').trim();
const PROJECT_ID = ((process.env.PROJECT_ID || fileEnv.PROJECT_ID) + '').replace(/^"|"$/g, '').trim();

if (!TOKEN || !PROJECT_ID) {
  console.error('PROJECT_ACCESS_TOKEN and PROJECT_ID are required in env or .env/<env>.json');
  process.exit(1);
}

const args = process.argv.slice(2);
let prefix = null;
let dryRun = false;
for (const a of args) {
  if (a.startsWith('--prefix=')) prefix = a.split('=')[1];
  if (a === '--dry-run') dryRun = true;
}
if (!prefix) {
  console.error('Usage: node delete-prefixed-zambdas.js --prefix=your-prefix [--dry-run]');
  process.exit(1);
}

const headers = {
  accept: 'application/json',
  authorization: `Bearer ${TOKEN}`,
  'x-oystehr-project-id': PROJECT_ID,
};

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${text}`);
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

(async () => {
  console.log('Listing zambdas...');
  const listUrl = `${BASE_URL}/v1/zambda`;
  const zambdas = await fetchJson(listUrl, { method: 'GET', headers });
  if (!Array.isArray(zambdas)) {
    console.error('Unexpected response for list zambdas:', zambdas);
    process.exit(1);
  }
  console.log('Found', zambdas.length, 'zambdas');

  const toDelete = zambdas.filter((z) => {
    const name = z.name || z.id || z._id;
    return typeof name === 'string' && name.startsWith(prefix);
  });

  console.log('Will delete', toDelete.length, 'zambdas with prefix', prefix);
  const results = [];
  for (const z of toDelete) {
    const id = z.id || z._id || z.name;
    const name = z.name || id;
    console.log((dryRun ? '[dry-run]' : '') + ` Deleting ${name} (${id})`);
    if (!dryRun) {
      const delUrl = `${BASE_URL}/v1/zambda/${encodeURIComponent(id)}`;
      try {
        const res = await fetchJson(delUrl, { method: 'DELETE', headers });
        results.push({ id, name, res });
      } catch (err) {
        console.error(' Failed to delete', name, err.message || err);
        results.push({ id, name, error: err.message || String(err) });
      }
    } else {
      results.push({ id, name, dryRun: true });
    }
  }

  console.log('\nSummary:');
  for (const r of results) {
    if (r.dryRun) console.log(' DRY:', r.name);
    else if (r.error) console.log(' ERR :', r.name, r.error);
    else console.log(' OK  :', r.name);
  }
  console.log('\nDone');
})();

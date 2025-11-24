#!/usr/bin/env node
/*
Fetch Zambda logs and save to ./.dist/logs/<zambda-name>/*.json

Usage:
  ZAPEHR_TOKEN=... ZAPEHR_PROJECT_ID=... node fetch-zambda-logs.js

Options:
  ZAPEHR_BASE_URL - optional, default https://project-api.zapehr.com

What it does:
  - GET /v1/zambda to list zambdas
  - For each zambda id:
      POST /v1/zambda/{id}/logStream (paginate using ?token=...)
      For each logStreamName returned:
        POST /v1/zambda/{id}/logStream/{logStreamName} with body { nextToken }
        paginate using nextForwardToken until none
  - Saves each log stream as JSON array in ./.dist/logs/<zambda-name>/<logStreamName>.json
*/

const { writeFile, mkdir, access, readFile } = require('fs').promises;
const fs = require('fs');
const path = require('path');

const zambdasToSkip = ['notifications-updater'];
const zambdasToFetch = []; // empty = fetch all, { id: 'zambda-id', name: 'zambda-name' }

// Try to load local env file (packages/zambdas/.env/local.json) and fall back to process.env
let fileEnv = {};
try {
  const envPath = path.resolve(__dirname, '../../', '.env', `${process.env.ENV}.json`);
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    fileEnv = JSON.parse(raw || '{}');
  }
} catch (err) {
  // ignore parse errors and continue with process.env
}

let BASE_URL = process.env.PROJECT_API || '';
if (!BASE_URL) BASE_URL = (fileEnv && fileEnv.PROJECT_API) || '';
if (!BASE_URL) BASE_URL = 'https://project-api.zapehr.com';
// Normalize: remove trailing '/v1' or trailing slash to avoid duplicate segments later
BASE_URL = BASE_URL.replace(/\/v1\/?$/, '');

// Trim and strip quotes from tokens loaded from env or file to avoid accidental quoting/newlines
const rawToken = (process.env.PROJECT_ACCESS_TOKEN || fileEnv.PROJECT_ACCESS_TOKEN || '') + '';
const rawProjectId = (process.env.PROJECT_ID || fileEnv.PROJECT_ID || '') + '';
const TOKEN = rawToken.replace(/^"|"$/g, '').trim();
const PROJECT_ID = rawProjectId.replace(/^"|"$/g, '').trim();

// Debug: show masked info to help diagnose auth/header issues
const mask = (s = '') => (s.length > 10 ? `${s.slice(0, 6)}...${s.slice(-4)} (len:${s.length})` : s);
console.log('Using BASE_URL=', BASE_URL);
console.log('Using PROJECT_ID=', mask(PROJECT_ID));
console.log('Using TOKEN=', mask(TOKEN));
const OUT_DIR = path.resolve(process.cwd(), '.dist', 'logs-' + process.env.ENV);

if (!TOKEN || !PROJECT_ID) {
  console.error('Environment variables PROJECT_ACCESS_TOKEN and PROJECT_ID are required.');
  process.exit(1);
}

const headers = {
  accept: 'application/json',
  authorization: `Bearer ${TOKEN}`,
  'x-oystehr-project-id': PROJECT_ID,
  'content-type': 'application/json',
};

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 200);
}

async function ensureDir(dir) {
  try {
    await access(dir);
  } catch (err) {
    await mkdir(dir, { recursive: true });
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

async function listZambdas() {
  const url = `${BASE_URL}/v1/zambda`;
  return fetchJson(url, { headers });
}

async function listLogStreams(zambdaId) {
  const logStreams = [];
  let nextToken = undefined;
  const seenTokens = new Set();
  while (true) {
    const url = `${BASE_URL}/v1/zambda/${encodeURIComponent(zambdaId)}/logStream`;
    const body = nextToken ? { token: nextToken } : {};
    console.log('Listing log streams with URL:', url, 'body:', body);
    const res = await fetchJson(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (Array.isArray(res.logStreams)) {
      for (const s of res.logStreams) logStreams.push(s.logStreamName);
    }
    if (!res.nextToken) break;
    // Detect repeated tokens to prevent infinite pagination loops
    if (seenTokens.has(res.nextToken)) {
      console.warn('Detected repeated nextToken while listing log streams - stopping pagination');
      break;
    }
    seenTokens.add(res.nextToken);
    nextToken = res.nextToken;
    // small delay to be polite
    await sleep(200);
  }
  return logStreams;
}

async function fetchLogEvents(zambdaId, logStreamName) {
  const events = [];
  let nextForwardToken = undefined;
  const seenForwardTokens = new Set();
  let attempt = 0;
  while (true) {
    const url = `${BASE_URL}/v1/zambda/${encodeURIComponent(zambdaId)}/logStream/${encodeURIComponent(
      logStreamName
    )}`;
    const body = nextForwardToken ? { nextToken: nextForwardToken } : {};
    const res = await fetchJson(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (Array.isArray(res.logEvents)) {
      events.push(...res.logEvents);
    }
    console.log('---seen forward tokens:', seenForwardTokens);
    nextForwardToken = res.nextBackwardToken;
    // If next token repeats (seen before), stop to avoid infinite loops
    if (nextForwardToken && seenForwardTokens.has(nextForwardToken)) {
      console.warn('Detected repeated nextForwardToken while fetching log events - stopping pagination');
      break;
    }
    if (nextForwardToken) seenForwardTokens.add(nextForwardToken);
    attempt++;
    // stop if no new token or token repeats
    if (!nextForwardToken) break;
    // guard against accidental infinite loops
    if (attempt > 5000) {
      console.warn('Too many pagination iterations, stopping');
      break;
    }
    await sleep(200);
  }
  console.log('---events fetched:', events.length);
  return events;
}

async function run() {
  console.log('Listing zambdas...');
  const zambdas = zambdasToFetch.length > 0 ? zambdasToFetch : await listZambdas();
  if (!Array.isArray(zambdas)) {
    console.error('Unexpected response from list zambdas:', zambdas);
    process.exit(1);
  }

  await ensureDir(OUT_DIR);
  const filteredZambdas = zambdas.filter((z) => !zambdasToSkip.includes(z.name));

  for (const z of filteredZambdas) {
    const id = z.id || z._id || z.name; // be flexible
    const name = z.name || id;
    const safeName = sanitizeFilename(name);
    const zdir = path.join(OUT_DIR, safeName);
    await ensureDir(zdir);
    console.log(`Fetching log streams for ${name} (${id})`);
    let streams = [];
    try {
      streams = await listLogStreams(id);
    } catch (err) {
      console.error('Failed to list log streams for', name, err);
      continue;
    }
    if (!streams || streams.length === 0) {
      console.log('No log streams for', name);
      continue;
    }
    console.log(`++++---- Found ${streams.length} log streams for ${name}`);

    for (const streamName of streams) {
      console.log(` Fetching events for stream ${streamName}`);
      try {
        const events = await fetchLogEvents(id, streamName);
        const safeStream = sanitizeFilename(streamName);
        const outFile = path.join(zdir, `${safeStream}.json`);
        await writeFile(outFile, JSON.stringify({ meta: { zambdaId: id, name }, logStreamName: streamName, events }, null, 2), 'utf8');
        console.log(`  Wrote ${events.length} events -> ${outFile}`);
      } catch (err) {
        console.error('  Failed to fetch events for stream', streamName, err);
      }
      // small delay between streams
      await sleep(200);
    }
  }

  console.log('Done');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

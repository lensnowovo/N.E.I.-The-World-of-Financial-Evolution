import { performance } from 'node:perf_hooks';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const base = new URL(args.get('--base') || 'http://127.0.0.1:3000');
const requests = Math.min(Math.max(Number(args.get('--requests') || 40), 1), 200);
const concurrency = Math.min(Math.max(Number(args.get('--concurrency') || 5), 1), 20);
const isProduction = base.hostname === 'nei-pevc.com' || base.hostname === 'www.nei-pevc.com';

if (isProduction && process.env.ALLOW_PRODUCTION_LOAD_TEST !== 'true') {
  console.error('Refusing to load-test production. Use Preview/local, or explicitly set ALLOW_PRODUCTION_LOAD_TEST=true.');
  process.exit(2);
}

const checks = [
  { path: '/', expected: 200 },
  {
    path: '/api/health',
    expected: process.env.HEALTHCHECK_TOKEN ? 200 : 404,
    init: process.env.HEALTHCHECK_TOKEN
      ? { headers: { Authorization: `Bearer ${process.env.HEALTHCHECK_TOKEN}` } }
      : undefined,
  },
  {
    path: '/api/mcp',
    expected: 401,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    },
  },
];

let cursor = 0;
const latencies = [];
const failures = [];

async function worker() {
  while (cursor < requests) {
    const current = cursor++;
    const check = checks[current % checks.length];
    const startedAt = performance.now();
    try {
      const response = await fetch(new URL(check.path, base), {
        ...check.init,
        signal: AbortSignal.timeout(10_000),
      });
      latencies.push(performance.now() - startedAt);
      if (response.status !== check.expected) {
        failures.push(`${check.path}: expected ${check.expected}, received ${response.status}`);
      }
      await response.arrayBuffer();
    } catch (error) {
      failures.push(`${check.path}: ${error instanceof Error ? error.message : 'request failed'}`);
    }
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
latencies.sort((a, b) => a - b);
const percentile = (value) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))] || 0;

console.log(JSON.stringify({
  base: base.origin,
  requests,
  concurrency,
  durationMs: Math.round(performance.now() - startedAt),
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  failures: failures.slice(0, 10),
}, null, 2));

if (failures.length) process.exit(1);

/**
 * Lightweight API metrics wrapper.
 *
 * Samples route latency/status into MetricSample for the admin dashboard.
 * Writes are best-effort: failures are swallowed and never affect business
 * responses. We await sampled writes instead of fire-and-forget because Vercel
 * serverless functions can end execution right after a response is returned,
 * which caused noisy Prisma errors in production logs.
 */
import { prisma } from './db';

const SAMPLE_RATE = 0.2;
const SLOW_MS = 1500;

type RouteHandler<Rest extends unknown[] = unknown[]> = (
  req: Request,
  ...rest: Rest
) => Promise<Response> | Response;

export function withMetrics<Rest extends unknown[]>(
  route: string,
  handler: RouteHandler<Rest>,
): RouteHandler<Rest> {
  return async function metricsWrapped(req: Request, ...rest: Rest): Promise<Response> {
    const start = Date.now();
    let res: Response;

    try {
      res = await handler(req, ...rest);
    } catch (err) {
      await recordSample(route, 500, Date.now() - start, true);
      throw err;
    }

    const durationMs = Date.now() - start;
    const status = res.status;
    await recordSample(route, status, durationMs, status >= 500);
    return res;
  };
}

async function recordSample(route: string, status: number, durationMs: number, error: boolean) {
  const shouldLog = error || durationMs >= SLOW_MS || Math.random() < SAMPLE_RATE;
  if (!shouldLog) return;

  try {
    await prisma.metricSample.create({ data: { route, status, durationMs, error } });
  } catch {
    // Observability writes are non-critical.
  }
}

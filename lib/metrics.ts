/**
 * 轻量 API 观测：给关键路由套一层 withMetrics，采样记录
 * 响应时间 / 状态码 / 是否出错，写入 MetricSample 表，供管理员 dashboard 聚合。
 *
 * 设计取舍（serverless / Neon Free 友好）：
 * - 采样而非全量：成功请求按 SAMPLE_RATE 抽样；错误(5xx)与慢请求(>=SLOW_MS)一律记录。
 *   低流量站点全量写会把 DB 写放大成主要负载，采样足以反映趋势。
 * - fire-and-forget：写入失败不影响业务响应（.catch 吞掉）。
 * - 不在 Next middleware(Edge) 里写 —— Edge 不能连 Neon，故在路由层(Node)采集。
 */
import { prisma } from './db';

const SAMPLE_RATE = 0.2; // 成功请求采样比例
const SLOW_MS = 1500; // 慢请求阈值（ms），达到则必记

// App Router 路由 handler 的宽泛签名（兼容 (req) 与 (req, ctx) 两种）
type RouteHandler<Rest extends unknown[] = unknown[]> = (
  req: Request,
  ...rest: Rest
) => Promise<Response> | Response;

// 泛型保留原 handler 的 rest 参数签名（如 (req, { params })），包裹后类型不变，
// 避免 strict 模式下把带 ctx 的 handler 赋给 (req, ...unknown[]) 报 contravariance 错。
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
      recordSample(route, 500, Date.now() - start, true);
      throw err;
    }
    const durationMs = Date.now() - start;
    const status = res.status;
    recordSample(route, status, durationMs, status >= 500);
    return res;
  };
}

function recordSample(route: string, status: number, durationMs: number, error: boolean) {
  const shouldLog = error || durationMs >= SLOW_MS || Math.random() < SAMPLE_RATE;
  if (!shouldLog) return;
  prisma.metricSample
    .create({ data: { route, status, durationMs, error } })
    .catch(() => {
      /* 观测写入失败不影响业务 */
    });
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { LineChart, Legend, StatCard, BarList } from './charts';

type Metrics = {
  traffic: {
    today: { newPosts: number; newUsers: number; mcpCalls: number; activeUsers: number };
    totals: { posts: number; users: number; mcpCalls: number };
    trend: { date: string; posts: number; users: number; mcpCalls: number; activeUsers: number }[];
    topSkills: { postId: number; title: string; calls: number }[];
  };
  pressure: {
    db: { latencyMs: number | null; connections: { state: string; count: number }[] };
    api: {
      sampleCount: number;
      avgMs: number;
      p50Ms: number;
      p95Ms: number;
      errorCount: number;
      errorRate: number;
      byRoute: { route: string; count: number; avgMs: number; errors: number }[];
    };
  };
  fetchedAt: string;
};

export function MetricsView() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/metrics', { cache: 'no-store' });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error || '加载失败');
        return;
      }
      setData(d);
    } catch {
      setErr('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <div className="border border-paper-edge bg-vellum/50 rounded-md p-10 text-center font-serif italic text-sepia">汇总数据中…（冷启动可能要几秒）</div>;
  }
  if (err && !data) {
    return (
      <div className="border border-wax-red/40 bg-vellum rounded-md p-6 text-center">
        <p className="font-sans text-sm text-wax-red mb-3">{err}</p>
        <button onClick={load} className="font-serif text-sm text-ink-brown underline">重试</button>
      </div>
    );
  }
  if (!data) return null;

  const dbLat = data.pressure.db.latencyMs;
  const connTotal = data.pressure.db.connections.reduce((s, c) => s + c.count, 0);
  const connActive = data.pressure.db.connections.find((c) => c.state === 'active')?.count ?? 0;

  // 颜色按阈值
  const latColor = dbLat == null ? '#8B6F4E' : dbLat < 120 ? '#4F5B3B' : dbLat < 500 ? '#A88339' : '#8B2E2A';
  const apiColor = data.pressure.api.avgMs < 300 ? '#4F5B3B' : data.pressure.api.avgMs < 1000 ? '#A88339' : '#8B2E2A';
  const errColor = data.pressure.api.errorRate > 0 ? '#8B2E2A' : '#4F5B3B';

  return (
    <div className="space-y-10">
      {/* —— 流量 —— */}
      <section>
        <SectionTitle title="使用流量" hint={`累计 ${data.traffic.totals.posts} 帖 · ${data.traffic.totals.users} 用户 · ${data.traffic.totals.mcpCalls} MCP 调用`} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard value={data.traffic.today.newPosts} label="今日新帖" accent="#3D2E1F" />
          <StatCard value={data.traffic.today.newUsers} label="今日新用户" accent="#8B6F4E" />
          <StatCard value={data.traffic.today.mcpCalls} label="今日 MCP 调用" accent="#A88339" />
          <StatCard value={data.traffic.today.activeUsers} label="今日活跃人数" accent="#4F5B3B" />
        </div>

        <div className="border border-paper-edge bg-vellum/50 rounded-md p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h4 className="font-serif text-sm text-ink-brown">近 14 天趋势</h4>
            <Legend series={[
              { label: 'MCP 调用', color: '#A88339' },
              { label: '活跃用户', color: '#4F5B3B' },
              { label: '新帖', color: '#3D2E1F' },
            ]} />
          </div>
          <LineChart
            labels={data.traffic.trend.map((t) => t.date)}
            series={[
              { label: 'MCP 调用', color: '#A88339', values: data.traffic.trend.map((t) => t.mcpCalls) },
              { label: '活跃用户', color: '#4F5B3B', values: data.traffic.trend.map((t) => t.activeUsers) },
              { label: '新帖', color: '#3D2E1F', values: data.traffic.trend.map((t) => t.posts) },
            ]}
          />
        </div>

        <div className="mt-4">
          <h4 className="font-serif text-sm text-ink-brown mb-2">热门 Skill（MCP 调用）</h4>
          <BarList items={data.traffic.topSkills.map((s) => ({ label: s.title, value: s.calls }))} />
        </div>
      </section>

      {/* —— 服务器压力 —— */}
      <section>
        <SectionTitle title="服务器压力" hint="实时探测 + 最近 24h 采样" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard
            value={dbLat == null ? '—' : `${dbLat}ms`}
            label="DB 响应延迟"
            sub="探测 SELECT 1"
            accent={latColor}
          />
          <StatCard
            value={connTotal}
            label="Neon 连接数"
            sub={connTotal ? `${connActive} 活跃` : 'pg_stat_activity 不可读'}
            accent="#3D2E1F"
          />
          <StatCard
            value={data.pressure.api.sampleCount === 0 ? '—' : `${data.pressure.api.avgMs}ms`}
            label="API 平均响应"
            sub={data.pressure.api.sampleCount === 0 ? '暂无样本' : `p95 ${data.pressure.api.p95Ms}ms`}
            accent={apiColor}
          />
          <StatCard
            value={data.pressure.api.sampleCount === 0 ? '—' : `${(data.pressure.api.errorRate * 100).toFixed(1)}%`}
            label="API 错误率"
            sub={data.pressure.api.sampleCount === 0 ? '暂无样本' : `${data.pressure.api.errorCount} 次错误 / ${data.pressure.api.sampleCount} 样本`}
            accent={errColor}
          />
        </div>

        <div className="border border-paper-edge bg-vellum/50 rounded-md p-4">
          <h4 className="font-serif text-sm text-ink-brown mb-3">按路由（最近 24h）</h4>
          {data.pressure.api.byRoute.length > 0 ? (
            <div className="space-y-2">
              {data.pressure.api.byRoute.map((r) => (
                <div key={r.route} className="flex items-center gap-3 text-xs">
                  <code className="font-mono text-leather w-44 shrink-0 truncate" title={r.route}>{r.route}</code>
                  <span className="flex-1 h-1.5 bg-linen rounded-sm overflow-hidden">
                    <span className="block h-full bg-gilded/50" style={{ width: `${Math.min(100, (r.avgMs / Math.max(1, data.pressure.api.p95Ms || 1)) * 100)}%` }} />
                  </span>
                  <span className="font-mono text-sepia w-16 text-right shrink-0">{r.avgMs}ms · {r.count}次</span>
                  {r.errors > 0 && <span className="font-sans text-wax-red w-10 text-right shrink-0">{r.errors}错</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="font-serif italic text-xs text-sepia">暂无 API 样本（流量上来后会自动采样）</p>
          )}
          <p className="mt-4 font-sans text-[10px] text-sepia/80 leading-relaxed">
            说明：API 响应时间 / 错误率为本站采样自测（含 DB 往返，近似 Vercel 函数耗时）。
            Neon 连接数反映数据库压力，DB 延迟反映冷启动 / 查询压力——这两项是 Neon Free 需要重点盯的。
            更完整的函数耗时 / 调用链见 <span className="underline">Vercel → Monitoring</span>。
          </p>
        </div>
      </section>

      <div className="flex items-center justify-between pt-2 border-t border-paper-edge">
        <span className="font-mono text-[10px] text-sepia">
          数据更新于 {new Date(data.fetchedAt).toLocaleString('zh-CN')}
        </span>
        <button onClick={load} disabled={loading} className="font-serif text-xs text-ink-brown hover:underline disabled:opacity-50">
          {loading ? '刷新中…' : '↻ 刷新'}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-paper-edge">
      <h3 className="font-serif text-xl text-ink-brown">{title}</h3>
      {hint && <span className="font-sans text-[11px] text-sepia">{hint}</span>}
    </div>
  );
}

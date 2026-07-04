'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarList, Legend, LineChart, StatCard } from './charts';

type TrendRow = {
  date: string;
  pageViews: number;
  webActiveUsers: number;
  mcpActiveUsers: number;
  engagedUsers: number;
  newUsers: number;
  newPosts: number;
  favorites: number;
  comments: number;
  searches: number;
  mcpCalls: number;
};

type Metrics = {
  traffic: {
    timezone: string;
    today: {
      pageViews: number;
      webActiveUsers: number;
      mcpActiveUsers: number;
      engagedUsers: number;
      newUsers: number;
      newPosts: number;
      favorites: number;
      searches: number;
      mcpCalls: number;
    };
    totals: { posts: number; users: number; mcpCalls: number; favorites: number };
    trend: TrendRow[];
  };
  funnel: {
    windowDays: number;
    registeredUsers: number;
    favoritedUsers: number;
    tokenUsers: number;
    tokenUsedUsers: number;
    repeatMcpUsers: number;
    yesterdayCohortUsers: number;
    yesterdayRetainedToday: number;
    yesterdayD1Retention: number | null;
    totalTokenUsers: number;
    totalTokenUsedUsers: number;
  };
  content: {
    publishedCount: number;
    pendingCount: number;
    featuredCount: number;
    mcpReadyCount: number;
    zeroFavorites: number;
    zeroMcpCalls: number;
    topFavorited: { postId: number; title: string; count: number }[];
    topMcp: { postId: number; title: string; count: number }[];
  };
  activity: {
    byType: { label: string; value: number }[];
    bySource: { label: string; value: number }[];
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

const EVENT_LABELS: Record<string, string> = {
  page_view: '页面访问',
  search: '搜索',
  filter: '筛选',
  post_view: '详情浏览',
  favorite_add: '收藏',
  favorite_remove: '取消收藏',
  post_create: '发布',
  comment_create: '评论',
  mcp_token_create: '生成 Token',
  mcp_token_delete: '撤销 Token',
  mcp_call: 'MCP 调用',
  web: 'Web',
  'web-api': 'Web API',
  mcp: 'MCP',
  unknown: '未知',
};

function eventLabel(value: string): string {
  return EVENT_LABELS[value] ?? value;
}

function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

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
    return (
      <div className="border border-paper-edge bg-vellum/50 rounded-md p-10 text-center font-serif italic text-sepia">
        正在汇总产品数据…
      </div>
    );
  }

  if (err && !data) {
    return (
      <div className="border border-wax-red/40 bg-vellum rounded-md p-6 text-center">
        <p className="font-sans text-sm text-wax-red mb-3">{err}</p>
        <button onClick={load} className="font-serif text-sm text-ink-brown underline">
          重试
        </button>
      </div>
    );
  }

  if (!data) return null;

  const today = data.traffic.today;
  const dbLat = data.pressure.db.latencyMs;
  const connTotal = data.pressure.db.connections.reduce((sum, item) => sum + item.count, 0);
  const connActive = data.pressure.db.connections.find((item) => item.state === 'active')?.count ?? 0;
  const dbAccent = dbLat == null ? '#8B6F4E' : dbLat < 120 ? '#4F5B3B' : dbLat < 500 ? '#A88339' : '#8B2E2A';
  const apiAccent = data.pressure.api.avgMs < 300 ? '#4F5B3B' : data.pressure.api.avgMs < 1000 ? '#A88339' : '#8B2E2A';
  const errAccent = data.pressure.api.errorRate > 0 ? '#8B2E2A' : '#4F5B3B';

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle
          title="Product Cockpit"
          hint={`北京时间口径 · 累计 ${data.traffic.totals.users} 用户 / ${data.traffic.totals.posts} 内容 / ${data.traffic.totals.mcpCalls} MCP 调用`}
        />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <StatCard value={today.webActiveUsers} label="今日 Web 活跃" sub="访问 / 搜索 / 收藏 / 评论" accent="#3D2E1F" />
          <StatCard value={today.mcpActiveUsers} label="今日 MCP 活跃" sub={`${today.mcpCalls} 次调用`} accent="#A88339" />
          <StatCard value={today.engagedUsers} label="今日总活跃" sub="Web + MCP 去重" accent="#4F5B3B" />
          <StatCard value={today.favorites} label="今日收藏" sub={`${today.searches} 次搜索/筛选`} accent="#8B6F4E" />
          <StatCard value={today.newUsers} label="今日新用户" sub={`${today.pageViews} 次页面访问`} accent="#6F4E37" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="活跃用户趋势"
            legend={[
              { label: 'Web 活跃', color: '#3D2E1F' },
              { label: 'MCP 活跃', color: '#A88339' },
              { label: '总活跃', color: '#4F5B3B' },
            ]}
          >
            <LineChart
              labels={data.traffic.trend.map((row) => row.date)}
              series={[
                { label: 'Web 活跃', color: '#3D2E1F', values: data.traffic.trend.map((row) => row.webActiveUsers) },
                { label: 'MCP 活跃', color: '#A88339', values: data.traffic.trend.map((row) => row.mcpActiveUsers) },
                { label: '总活跃', color: '#4F5B3B', values: data.traffic.trend.map((row) => row.engagedUsers) },
              ]}
            />
          </ChartCard>
          <ChartCard
            title="工作流动作趋势"
            legend={[
              { label: 'MCP 调用', color: '#A88339' },
              { label: '收藏', color: '#8B2E2A' },
              { label: '搜索/筛选', color: '#4F5B3B' },
            ]}
          >
            <LineChart
              labels={data.traffic.trend.map((row) => row.date)}
              series={[
                { label: 'MCP 调用', color: '#A88339', values: data.traffic.trend.map((row) => row.mcpCalls) },
                { label: '收藏', color: '#8B2E2A', values: data.traffic.trend.map((row) => row.favorites) },
                { label: '搜索/筛选', color: '#4F5B3B', values: data.traffic.trend.map((row) => row.searches) },
              ]}
            />
          </ChartCard>
        </div>
      </section>

      <section>
        <SectionTitle title="Activation Funnel" hint={`最近 ${data.funnel.windowDays} 天新用户 · 看是否走通收藏与 MCP`} />
        <div className="grid gap-3 md:grid-cols-5">
          <FunnelStep title="注册" value={data.funnel.registeredUsers} />
          <FunnelStep title="收藏 Skill" value={data.funnel.favoritedUsers} base={data.funnel.registeredUsers} />
          <FunnelStep title="生成 Token" value={data.funnel.tokenUsers} base={data.funnel.registeredUsers} />
          <FunnelStep title="首次 MCP" value={data.funnel.tokenUsedUsers} base={data.funnel.registeredUsers} />
          <FunnelStep title="重复 MCP" value={data.funnel.repeatMcpUsers} base={data.funnel.registeredUsers} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatCard
            value={formatPercent(data.funnel.yesterdayD1Retention)}
            label="昨日注册 D1 留存"
            sub={`${data.funnel.yesterdayRetainedToday}/${data.funnel.yesterdayCohortUsers} 今日仍活跃`}
            accent="#4F5B3B"
          />
          <StatCard value={data.funnel.totalTokenUsers} label="累计 Token 用户" sub={`${data.funnel.totalTokenUsedUsers} 人已成功调用`} accent="#A88339" />
          <StatCard value={data.traffic.totals.favorites} label="累计收藏" sub="判断内容是否有保存价值" accent="#8B2E2A" />
        </div>
      </section>

      <section>
        <SectionTitle title="Content Health" hint="内容是否足够可信、可收藏、可被 MCP 调用" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
          <StatCard value={data.content.publishedCount} label="已发布" />
          <StatCard value={data.content.mcpReadyCount} label="MCP Ready" accent="#4F5B3B" />
          <StatCard value={data.content.featuredCount} label="精选" accent="#A88339" />
          <StatCard value={data.content.pendingCount} label="待审核" accent={data.content.pendingCount > 0 ? '#8B2E2A' : '#4F5B3B'} />
          <StatCard value={data.content.zeroFavorites} label="零收藏内容" accent="#8B6F4E" />
          <StatCard value={data.content.zeroMcpCalls} label="零 MCP 调用" accent="#8B6F4E" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="最常被收藏">
            <BarList items={data.content.topFavorited.map((item) => ({ label: `#${item.postId} ${item.title}`, value: item.count }))} />
          </ChartCard>
          <ChartCard title="最常被 MCP 调用">
            <BarList items={data.content.topMcp.map((item) => ({ label: `#${item.postId} ${item.title}`, value: item.count }))} />
          </ChartCard>
        </div>
      </section>

      <section>
        <SectionTitle title="Activity Mix" hint="新埋点上线后，这里会逐步显示站内行为结构" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="事件类型">
            <BarList items={data.activity.byType.map((item) => ({ label: eventLabel(item.label), value: item.value }))} />
          </ChartCard>
          <ChartCard title="来源">
            <BarList items={data.activity.bySource.map((item) => ({ label: eventLabel(item.label), value: item.value }))} />
          </ChartCard>
        </div>
      </section>

      <section>
        <SectionTitle title="System Health" hint="最近 24 小时 API 采样与数据库探测" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard value={dbLat == null ? '—' : `${dbLat}ms`} label="DB 响应" sub="SELECT 1" accent={dbAccent} />
          <StatCard value={connTotal} label="Neon 连接" sub={`${connActive} active`} accent="#3D2E1F" />
          <StatCard value={data.pressure.api.sampleCount === 0 ? '—' : `${data.pressure.api.avgMs}ms`} label="API 平均耗时" sub={`p95 ${data.pressure.api.p95Ms}ms`} accent={apiAccent} />
          <StatCard value={data.pressure.api.sampleCount === 0 ? '—' : `${(data.pressure.api.errorRate * 100).toFixed(1)}%`} label="API 错误率" sub={`${data.pressure.api.errorCount} errors`} accent={errAccent} />
        </div>
        <ChartCard title="路由耗时采样">
          <div className="space-y-2">
            {data.pressure.api.byRoute.length === 0 ? (
              <p className="font-serif italic text-xs text-sepia">暂无 API 样本</p>
            ) : (
              data.pressure.api.byRoute.map((route) => (
                <div key={route.route} className="flex items-center gap-3 text-xs">
                  <code className="font-mono text-leather w-44 shrink-0 truncate" title={route.route}>
                    {route.route}
                  </code>
                  <span className="flex-1 h-1.5 bg-linen rounded-sm overflow-hidden">
                    <span
                      className="block h-full bg-gilded/50"
                      style={{ width: `${Math.min(100, (route.avgMs / Math.max(1, data.pressure.api.p95Ms || 1)) * 100)}%` }}
                    />
                  </span>
                  <span className="font-mono text-[11px] text-sepia w-24 text-right shrink-0">
                    {route.avgMs}ms · {route.count}
                  </span>
                  {route.errors > 0 && <span className="font-sans text-wax-red w-10 text-right shrink-0">{route.errors} 错</span>}
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </section>

      <div className="flex items-center justify-between pt-2 border-t border-paper-edge">
        <span className="font-mono text-[10px] text-sepia">
          数据更新于 {new Date(data.fetchedAt).toLocaleString('zh-CN')}
        </span>
        <button onClick={load} disabled={loading} className="font-serif text-xs text-ink-brown hover:underline disabled:opacity-50">
          {loading ? '刷新中…' : '刷新'}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-paper-edge flex-wrap">
      <h3 className="font-serif text-xl text-ink-brown">{title}</h3>
      {hint && <span className="font-sans text-[11px] text-sepia">{hint}</span>}
    </div>
  );
}

function ChartCard({
  title,
  legend,
  children,
}: {
  title: string;
  legend?: { label: string; color: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="border border-paper-edge bg-vellum/50 rounded-md p-4">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h4 className="font-serif text-sm text-ink-brown">{title}</h4>
        {legend && <Legend series={legend} />}
      </div>
      {children}
    </div>
  );
}

function FunnelStep({
  title,
  value,
  base,
}: {
  title: string;
  value: number;
  base?: number;
}) {
  const rate = base && base > 0 ? value / base : null;
  return (
    <div className="border border-paper-edge bg-vellum rounded-md p-3">
      <p className="font-serif text-2xl num-osf text-ink-brown leading-none">{value}</p>
      <p className="mt-1.5 font-sans text-[11px] text-sepia">{title}</p>
      <p className="font-mono text-[10px] text-leather/70 mt-0.5">{rate == null ? 'baseline' : formatPercent(rate)}</p>
    </div>
  );
}

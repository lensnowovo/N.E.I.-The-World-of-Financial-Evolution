import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#f5efe2',
          color: '#3a2a1f',
          border: '18px solid #e4d5bd',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 34, letterSpacing: 5, color: '#8a6b43' }}>N.E.I.</div>
          <div style={{ fontSize: 24, color: '#8a6b43' }}>New Era Investors</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ fontSize: 74, lineHeight: 1.08, maxWidth: 960 }}>
            一级市场投资人的 AI Skills Hub
          </div>
          <div style={{ fontSize: 31, lineHeight: 1.45, maxWidth: 930, color: '#6f5b49' }}>
            PE / VC / FA 的 Skill Library、Workflow 与 MCP 工作流平台
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 20,
            fontSize: 24,
            color: '#6f5b49',
            borderTop: '2px solid #d8c7ab',
            paddingTop: 28,
          }}
        >
          <span>BP 初筛</span>
          <span>·</span>
          <span>行业研究</span>
          <span>·</span>
          <span>IC Memo</span>
          <span>·</span>
          <span>MCP 调用</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

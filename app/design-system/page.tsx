import type { Metadata } from 'next';
import { Card, CardTitle, CardMeta } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import {
  SceneChip,
  IndustryChip,
  ContentChip,
  SkillChip,
} from '@/components/ui/Chip';
import { RoleBadge } from '@/components/icons/RoleBadge';
import { SkillIcon } from '@/components/icons/SkillIcon';
import { Ornament } from '@/components/icons/Ornament';

export const metadata: Metadata = {
  title: '设计系统 · PEVC 知识平台',
};

/* —— 用于展示的真实标签字面量 —— */
const COLORS: Array<{ name: string; varName: string; hex: string; note: string }> = [
  { name: 'parchment', varName: '--parchment', hex: '#F5EFE3', note: '主背景 · 羊皮纸' },
  { name: 'linen', varName: '--linen', hex: '#EDE6D6', note: '次级背景 · 亚麻' },
  { name: 'vellum', varName: '--vellum', hex: '#FAF6EC', note: '卡片底 · 最浅' },
  { name: 'paper-edge', varName: '--paper-edge', hex: '#E4DAC4', note: '分割线 / 边框' },
  { name: 'ink-brown', varName: '--ink-brown', hex: '#3D2E1F', note: '主文本 · 棕墨水' },
  { name: 'leather', varName: '--leather', hex: '#6B4F35', note: '副文本 · 旧皮革' },
  { name: 'sepia', varName: '--sepia', hex: '#8B6F4E', note: '弱化文本' },
  { name: 'wax-red', varName: '--wax-red', hex: '#8B2E2A', note: '蜡封红 · CTA / Danger' },
  { name: 'gilded', varName: '--gilded', hex: '#A88339', note: '暗金 · 徽章 / Warning' },
  { name: 'moss', varName: '--moss', hex: '#4F5B3B', note: '苔藓绿 · Success' },
];

const SKILLS: Array<{ key: string; label: string }> = [
  { key: 'prompt', label: 'Prompt' },
  { key: 'agent-skill', label: 'Agent Skill' },
  { key: 'workflow', label: 'Workflow' },
  { key: 'tool-stack', label: 'Tool Stack' },
  { key: 'template', label: 'Template' },
  { key: 'api-script', label: 'API / Script' },
  { key: 'case-study', label: 'Case Study' },
];

export default function DesignSystemPage() {
  return (
    <article className="mx-auto max-w-prose">
      {/* —— 页眉 —— */}
      <header className="text-center mb-16">
        <p className="font-display tracking-display text-xs text-sepia uppercase mb-3">
          Design System · I
        </p>
        <h1 className="font-serif text-5xl text-ink-brown mb-4">
          手抄本 · 设计系统
        </h1>
        <p className="font-serif italic text-leather text-lg">
          A modern manuscript for the private market
        </p>
        <div className="flex justify-center mt-6">
          <Ornament />
        </div>
      </header>

      {/* ========== 一、调色板 ========== */}
      <Section index="I" title="调色板 · Palette" subtitle="十个 token，覆盖中性、主色、强调三层">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {COLORS.map((c) => (
            <div key={c.name} className="border border-paper-edge rounded-sm overflow-hidden">
              <div
                className="h-20"
                style={{ background: `var(${c.varName})` }}
              />
              <div className="px-3 py-2 bg-vellum">
                <div className="font-sans text-xs text-ink-brown">{c.name}</div>
                <div className="font-serif text-xs text-sepia mt-0.5">{c.hex}</div>
                <div className="font-sans text-[10px] text-leather mt-1">{c.note}</div>
              </div>
            </div>
          ))}
        </div>
        <Note>
          饱和色（wax-red / gilded）在任意页面合计面积不得超过 5%。
          所有视觉容器禁止使用纯白 / 纯黑，请用 vellum 与 ink-brown 替代。
        </Note>
      </Section>

      {/* ========== 二、字体阶梯 ========== */}
      <Section index="II" title="字体 · Typography" subtitle="衬线为骨、无衬线为肉">
        <div className="space-y-6 border-l border-paper-edge pl-6">
          <Specimen size="48px" family="font-serif" tag="H1 · Cormorant Garamond 500">
            一级市场的知识，应被认真写下
          </Specimen>
          <Specimen size="30px" family="font-serif" tag="H2 · 30/1.3">
            初筛与项目判断 · The Art of First Cut
          </Specimen>
          <Specimen size="24px" family="font-serif" tag="H3 · 24/1.4">
            维度三 · 工作内容
          </Specimen>
          <Specimen size="20px" family="font-serif" tag="H4 · Italic">
            <em>A short note on valuation</em>
          </Specimen>
          <Specimen size="15px" family="font-sans" tag="Body · Inter 15/1.75">
            正文使用无衬线，中英文混排时行高保持 1.7 以上，
            标点采用全角，避免阅读密度过高。
          </Specimen>
          <Specimen size="13px" family="font-sans" tag="Caption · 13/1.7">
            作者 / 时间 / 元数据，用 sepia 色，弱化处理。
          </Specimen>
          <Specimen size="20px" family="font-display tracking-display" tag="Display · Cinzel · 仅用于 Logo">
            PEVC
          </Specimen>
          <div className="pt-4">
            <p className="text-xs text-sepia mb-2">old-style figures · 衬线数字</p>
            <p className="num-osf text-3xl text-ink-brown">
              1234567890 · MMXXVI
            </p>
          </div>
        </div>
      </Section>

      {/* ========== 三、按钮 ========== */}
      <Section index="III" title="按钮 · Button" subtitle="四档变体 · 三档尺寸 · 圆角恒为 2px">
        <div className="space-y-4">
          <Row label="primary">
            <Button size="sm">小</Button>
            <Button>提交申请</Button>
            <Button size="lg">完成注册</Button>
            <Button disabled>禁用态</Button>
          </Row>
          <Row label="secondary">
            <Button variant="secondary" size="sm">小</Button>
            <Button variant="secondary">取消</Button>
            <Button variant="secondary" size="lg">返回上一步</Button>
          </Row>
          <Row label="ghost">
            <Button variant="ghost">登录</Button>
            <Button variant="ghost">查看全部</Button>
          </Row>
          <Row label="link">
            <Button variant="link">阅读完整版 →</Button>
          </Row>
        </div>
      </Section>

      {/* ========== 四、输入 ========== */}
      <Section index="IV" title="输入 · Form" subtitle="标签上方 · 衬线 · 左对齐">
        <div className="grid sm:grid-cols-2 gap-5">
          <Input label="邮箱" placeholder="your@email.com" />
          <Input
            label="验证码"
            placeholder="6 位数字"
            hint="开发模式下验证码固定为 123456"
          />
          <Input
            label="昵称"
            optional
            placeholder="2-20 字符 · 全平台唯一"
          />
          <Input label="错误示例" defaultValue="abc" error="密码至少 8 位，需含字母与数字" />
          <div className="sm:col-span-2">
            <Textarea label="简介" placeholder="一句话介绍自己（最多 200 字）" rows={3} />
          </div>
        </div>
      </Section>

      {/* ========== 五、四维标签 ========== */}
      <Section
        index="V"
        title="四维标签 · The Heraldic Four"
        subtitle="工作场景 / 行业 / 内容 / Skill · 视觉上严格区分"
      >
        <Subsection title="工作场景 · 印章式（必填，单选）">
          <div className="flex flex-wrap gap-2">
            <SceneChip>Sourcing</SceneChip>
            <SceneChip active>初筛与判断</SceneChip>
            <SceneChip>行业研究</SceneChip>
            <SceneChip>商业尽调</SceneChip>
            <SceneChip>IC 材料</SceneChip>
            <SceneChip>投后管理</SceneChip>
          </div>
        </Subsection>

        <Subsection title="行业赛道 · 药丸式（可选，单选）">
          <div className="flex flex-wrap gap-2">
            <IndustryChip>AI / SaaS</IndustryChip>
            <IndustryChip active>BioTech</IndustryChip>
            <IndustryChip>Consumer</IndustryChip>
            <IndustryChip>FinTech</IndustryChip>
            <IndustryChip>Climate</IndustryChip>
            <IndustryChip>Cross-border</IndustryChip>
          </div>
        </Subsection>

        <Subsection title="工作内容 · 折角小卡片（可选，多选 ≤ 3）">
          <div className="flex flex-wrap gap-2">
            <ContentChip>投资 Memo</ContentChip>
            <ContentChip active>风险识别</ContentChip>
            <ContentChip>专家访谈准备</ContentChip>
            <ContentChip>竞品地图</ContentChip>
            <ContentChip>报告生成</ContentChip>
          </div>
        </Subsection>

        <Subsection title="Skill 类型 · 圆形徽章（可选，单选）">
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((s) => (
              <SkillChip key={s.key} skillKey={s.key}>
                {s.label}
              </SkillChip>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2 text-center">
            {SKILLS.map((s) => (
              <div key={s.key} className="flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 grid place-content-center border border-paper-edge bg-vellum">
                  <SkillIcon skill={s.key} size={18} />
                </div>
                <p className="text-[10px] text-leather font-sans">{s.label}</p>
              </div>
            ))}
          </div>
        </Subsection>
      </Section>

      {/* ========== 六、身份徽章 ========== */}
      <Section
        index="VI"
        title="身份徽章 · The Three Crests"
        subtitle="VC / PE / FA · 出现在昵称、卡片、评论旁"
      >
        <div className="grid grid-cols-3 gap-4">
          {(['VC', 'PE', 'FA'] as const).map((r) => (
            <Card key={r} crest padding="md" className="text-center">
              <div className="flex justify-center mb-3">
                <RoleBadge role={r} size={56} />
              </div>
              <p className="font-display tracking-display text-sm text-ink-brown">
                {r}
              </p>
              <p className="font-serif italic text-sm text-leather mt-1">
                {r === 'VC' && 'Venture Capital'}
                {r === 'PE' && 'Private Equity'}
                {r === 'FA' && 'Financial Advisor'}
              </p>
              <p className="font-sans text-xs text-sepia mt-3 leading-relaxed">
                {r === 'VC' && '关注早期成长，喜欢未被验证的雄心'}
                {r === 'PE' && '聚焦成熟期结构，看重现金流与并购'}
                {r === 'FA' && '撮合方与中介，连接资金与项目'}
              </p>
            </Card>
          ))}
        </div>
        <Note>
          徽章颜色统一 gilded，描边 1px。在用户昵称旁使用 16px，在头像旁使用 20px。
        </Note>
      </Section>

      {/* ========== 七、卡片 ========== */}
      <Section
        index="VII"
        title="卡片 · Card"
        subtitle="vellum 底、1px paper-edge 描边、无阴影"
      >
        <Card interactive className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <RoleBadge role="VC" size={18} />
            <span className="font-sans text-sm text-ink-brown">墨研_拾光资本</span>
            <span className="font-sans text-xs text-sepia">· 三日前</span>
          </div>
          <CardTitle as="h3" className="mb-2">
            AI Agent 赛道 2026 Q1 行业地图与早期项目 Mapping
          </CardTitle>
          <p className="font-sans text-sm text-leather mb-4 leading-relaxed">
            从底层模型、工程能力、商业闭环三个维度梳理了 80 余家早期 Agent
            项目，附带筛选 Checklist 与红旗清单。
          </p>
          <div className="flex flex-wrap gap-2">
            <SceneChip>初筛与判断</SceneChip>
            <IndustryChip>AI / SaaS</IndustryChip>
            <ContentChip>竞品地图</ContentChip>
            <SkillChip skillKey="case-study">Case Study</SkillChip>
          </div>
        </Card>

        <Card crest tone="linen" padding="lg" className="text-center">
          <p className="font-display tracking-display text-xs text-sepia uppercase mb-3">
            With Crest Corners
          </p>
          <CardTitle className="mb-2">本卷 · 卷首致辞</CardTitle>
          <p className="font-serif italic text-leather text-base">
            此卡用于登录页 / 重要 Hero · 普通列表卡不要加角饰
          </p>
        </Card>
      </Section>

      {/* ========== 八、文章排版 ========== */}
      <Section
        index="VIII"
        title="文章排版 · Manuscript"
        subtitle="衬线正文 · 首字下沉 · 1.85 行高"
      >
        <article className="prose-manuscript">
          <p className="drop-cap">
            在过去半年里，我看了七十余家 AI Agent 方向的早期项目。可投与不可投之间，
            真正的差别从来不在估值的高低，而在创始团队对"工程化路径"是否有过深度的痛苦——
            那些只画过白板，没真在生产环境里被 prompt drift 折磨过的人，
            很难让模型从 Demo 走到产品。
          </p>
          <h2>第一步 · 定义可投性</h2>
          <p>
            不是所有 Agent 都值得投。我们关注的是<strong>能产生商业闭环</strong>，
            且<strong>有数据飞轮</strong>的项目。前者保证短期不会饿死，后者保证长期不会被取代。
          </p>
          <blockquote>
            "技术栈完全依赖单一供应商、护城河等于 prompt engineering" ——
            这两条加起来，足以让我把任何项目放进观望队列。
          </blockquote>
          <h3>子节 · 红旗清单</h3>
          <ul>
            <li>90% 收入来自前 3 个客户</li>
            <li>团队无人有过 7×24 生产稳定性经验</li>
            <li>创始人在路演中刻意回避边际成本曲线</li>
          </ul>
        </article>
      </Section>

      {/* ========== 九、分隔与装饰 ========== */}
      <Section
        index="IX"
        title="分隔与装饰 · Ornaments"
        subtitle="一页仅允许出现 1-2 次"
      >
        <div className="space-y-8">
          <div>
            <p className="text-xs text-sepia mb-3">花体分隔 · Ornament</p>
            <div className="flex justify-center text-leather">
              <Ornament />
            </div>
          </div>
          <div>
            <p className="text-xs text-sepia mb-3">单线 · divider-thin</p>
            <hr className="divider-thin" />
          </div>
          <div>
            <p className="text-xs text-sepia mb-3">双线 · divider-double（古籍版心）</p>
            <hr className="divider-double" />
          </div>
        </div>
      </Section>

      {/* —— 卷尾 —— */}
      <footer className="mt-section text-center">
        <div className="flex justify-center text-leather mb-4">
          <Ornament />
        </div>
        <p className="font-serif italic text-sepia">
          End of Design System · Volume I
        </p>
      </footer>
    </article>
  );
}

/* ============================================================
   局部辅助组件
   ============================================================ */
function Section({
  index,
  title,
  subtitle,
  children,
}: {
  index: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-section">
      <header className="mb-8">
        <p className="font-display tracking-display text-xs text-sepia uppercase mb-2">
          Chapter {index}
        </p>
        <h2 className="font-serif text-3xl text-ink-brown">{title}</h2>
        {subtitle && (
          <p className="font-serif italic text-leather mt-1.5">{subtitle}</p>
        )}
        <hr className="divider-thin mt-4" />
      </header>
      <div>{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="font-sans text-xs text-sepia uppercase tracking-wide mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-20 shrink-0 font-sans text-xs text-sepia uppercase tracking-wide">
        {label}
      </span>
      {children}
    </div>
  );
}

function Specimen({
  size,
  family,
  tag,
  children,
}: {
  size: string;
  family: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-sans text-[10px] tracking-wide text-sepia uppercase mb-1.5">
        {tag}
      </p>
      <div className={family} style={{ fontSize: size }}>
        {children}
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 border-l-2 border-paper-edge pl-4 font-serif italic text-sm text-leather">
      {children}
    </p>
  );
}

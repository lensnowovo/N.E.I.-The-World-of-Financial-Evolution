import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LIBRARY_EMAIL = 'library@pevc.local';
// Coverage seeds are not production-ready official Skills. Keep imported items
// out of public feed and MCP until each one has been manually reviewed and
// strengthened by the editorial team.
const SEED_STATUS = 'pending';
const SEED_REVIEW_FLAG = 'editorial-review-required: bundle coverage seed';

type SkillSeed = {
  title: string;
  body: string;
  tagScene: string;
  tagIndustry: string | null;
  tagContent: string[];
  assetType: string;
  installHint?: string;
  usageNotes?: string;
};

const SKILLS: SkillSeed[] = [
  {
    title: 'BP 初筛意见生成器：亮点、硬伤、追问和下一步判断',
    tagScene: 'screening',
    tagIndustry: null,
    tagContent: ['doc-parse', 'risk-id', 'memo'],
    assetType: 'prompt',
    usageNotes: '适合刚收到 BP 后快速形成内部初筛意见，不替代正式尽调。',
    body: `<p>把 BP 或项目摘要转成一页内部初筛意见，重点不是“夸项目”，而是快速判断是否值得进入下一轮。</p>
<h2>输出</h2>
<ul>
  <li>一句话项目判断</li>
  <li>3 个亮点、3 个硬伤</li>
  <li>需要追问创始人的问题</li>
  <li>建议动作：继续看 / 暂缓 / 放弃</li>
</ul>
<pre><code>你是一位一级市场投资经理。请基于我提供的 BP / 项目摘要，输出一份初筛意见。

要求：
1. 先用一句话说明这个项目到底做什么。
2. 提取团队、产品、客户、商业模式、融资诉求和关键经营数据。
3. 分别列出 3 个亮点、3 个硬伤。
4. 给出 8-12 个追问问题，按“市场 / 产品 / 商业化 / 财务 / 团队 / 风险”分组。
5. 最后给出投资判断：继续看、暂缓、放弃，并说明理由。

输入材料：
[粘贴 BP 文本或项目摘要]</code></pre>`,
  },
  {
    title: '专家访谈提纲生成器：客户、竞品、渠道和离职员工四类访谈',
    tagScene: 'business-dd',
    tagIndustry: null,
    tagContent: ['expert-call', 'info-gather', 'risk-id'],
    assetType: 'prompt',
    usageNotes: '适合商业尽调阶段快速准备专家访谈、客户访谈和竞品访谈。',
    body: `<p>商业尽调里，访谈提纲的质量直接决定能不能问出真实信息。这个 Prompt 会按受访对象生成不同问题，不把所有人都问成同一套。</p>
<h2>覆盖对象</h2>
<ul>
  <li>客户访谈：采购理由、续费、替代方案、预算优先级</li>
  <li>竞品访谈：市场格局、差异化、价格战、渠道关系</li>
  <li>渠道 / 供应商访谈：交付能力、回款、履约稳定性</li>
  <li>离职员工访谈：组织真实状态、销售质量、隐性风险</li>
</ul>
<pre><code>你是一位商业尽调负责人。请为以下项目生成专家访谈提纲。

项目信息：
[公司 / 行业 / 产品 / 目标客户 / 我们的核心疑问]

请输出：
1. 访谈目标：本轮访谈要验证的 3-5 个核心假设。
2. 受访对象分层：客户、竞品、渠道/供应商、离职员工分别适合问什么。
3. 每类对象生成 10 个问题，问题要具体，避免诱导。
4. 标记哪些问题是“试金石问题”，可以快速判断受访者是否真正懂行业。
5. 最后输出一张“证据强度表”：强证据 / 弱证据 / 需要交叉验证。</code></pre>`,
  },
  {
    title: '财务质量体检：毛利率、费用率、现金流和回款异常检查',
    tagScene: 'financial',
    tagIndustry: null,
    tagContent: ['data-clean', 'risk-id', 'memo'],
    assetType: 'prompt',
    usageNotes: '适合在看财务报表、管理账或审计报告时快速抓异常。',
    body: `<p>看财务不是只看收入增长。这个 Skill 把利润质量、现金流质量和预测可信度拆开，帮助投资团队快速找风险。</p>
<h2>检查重点</h2>
<ul>
  <li>毛利率：结构变化、一次性因素、产品 mix</li>
  <li>费用率：销售费用、研发投入、管理费用是否合理</li>
  <li>现金流：经营现金流和利润是否背离</li>
  <li>回款：应收账款、账期、坏账准备和大客户依赖</li>
</ul>
<pre><code>你是一位 PE/VC 财务尽调顾问。请基于以下财务数据做质量体检。

输入：
[粘贴收入、毛利率、费用率、经营现金流、应收账款、存货、预测数据]

请输出：
1. 收入质量：增长来自客户数、客单价、价格、渠道还是确认口径变化？
2. 利润质量：毛利率和费用率的变化是否可持续？
3. 现金流质量：净利润和经营现金流是否匹配，差异来自哪里？
4. 回款风险：应收、账期、客户集中度、坏账准备是否异常？
5. 预测校验：未来预测最依赖哪 3 个假设，分别如何验证？
6. 最后给出红旗清单和下一轮资料清单。</code></pre>`,
  },
  {
    title: 'IC 风险与反方观点生成器：把投资逻辑主动打穿',
    tagScene: 'ic',
    tagIndustry: null,
    tagContent: ['risk-id', 'debate', 'memo'],
    assetType: 'prompt',
    usageNotes: '适合 IC 前做 red team，提前准备风险和反方观点。',
    body: `<p>很多 IC Memo 最大的问题不是没有投资逻辑，而是没有认真写反方。这个 Prompt 会站在反对投资的一方，把核心风险讲透。</p>
<pre><code>你现在扮演投委会里最谨慎、最反对投资的委员。请基于以下项目材料做 red team。

项目材料：
[粘贴项目摘要、尽调结论、财务数据、交易条款]

请输出：
1. 反方一句话：为什么这个项目可能不该投。
2. 5 个核心风险，按“市场、产品、商业化、财务、团队、退出”分类。
3. 每个风险对应：触发条件、早期信号、验证资料、缓释方案。
4. 哪些风险是“可接受但要定价”的，哪些是“一票否决”的。
5. 最后给出投委会可能追问的 10 个尖锐问题。</code></pre>`,
  },
  {
    title: '投委会 Q&A 预演：20 个高压追问和答辩口径',
    tagScene: 'ic',
    tagIndustry: null,
    tagContent: ['debate', 'memo', 'report-gen'],
    assetType: 'prompt',
    usageNotes: '适合投委会前一天准备 Q&A，不建议替代真实事实核查。',
    body: `<p>用于 IC 前预演。它会模拟投委会对市场、估值、退出、条款和风险的追问，并要求回答不能空泛。</p>
<pre><code>你是一位资深投委会秘书。请基于以下项目材料生成投委会 Q&A。

材料：
[粘贴 IC Memo / 尽调摘要 / 估值模型 / 交易条款]

请输出：
1. 20 个投委会高频问题，按市场、公司、财务、估值、条款、退出、风险分类。
2. 每个问题给出“建议回答口径”，要求短、硬、有证据。
3. 标记哪些问题目前证据不足，需要补充材料。
4. 给出 5 个最可能影响决策的一票否决问题。
5. 最后生成一版 3 分钟口头汇报开场。</code></pre>`,
  },
  {
    title: '投资 Memo 一页纸：从尽调结论到 IC 决策摘要',
    tagScene: 'ic',
    tagIndustry: null,
    tagContent: ['memo', 'report-gen', 'risk-id'],
    assetType: 'workflow',
    usageNotes: '适合把分散尽调材料压缩成一页纸决策摘要。',
    body: `<p>把尽调材料压成一页纸，服务于 IC 的快速判断，而不是堆砌信息。</p>
<h2>工作流</h2>
<ol>
  <li>提炼项目一句话和交易建议。</li>
  <li>拆出投资逻辑、核心证据和关键假设。</li>
  <li>列出估值依据、退出路径和风险缓释。</li>
  <li>把需要投委会拍板的问题放到最前面。</li>
</ol>
<pre><code>请把以下尽调材料整理成一页 IC 决策摘要。

输出格式：
- 项目一句话
- 本轮决策事项
- 投资逻辑 3 条
- 核心证据 5 条
- 关键风险 5 条
- 估值和交易条款判断
- 退出路径
- 建议：投 / 不投 / 补充尽调后再议

材料：
[粘贴尽调材料]</code></pre>`,
  },
  {
    title: '投后月报模板：经营指标、现金流、团队和风险一页看清',
    tagScene: 'post-investment',
    tagIndustry: null,
    tagContent: ['memo', 'risk-id', 'report-gen'],
    assetType: 'template',
    usageNotes: '适合要求被投公司按月提交经营简报，也适合投资经理内部跟踪。',
    body: `<p>投后月报最怕变成流水账。这个模板要求被投公司围绕经营指标、现金流和风险写，不鼓励只报喜。</p>
<h2>月报结构</h2>
<ul>
  <li>本月关键进展</li>
  <li>核心 KPI：收入、毛利率、现金流、回款、客户、产品</li>
  <li>异常指标和原因</li>
  <li>下月目标和需要股东支持的事项</li>
</ul>
<pre><code>请基于以下被投公司本月数据，生成投后月报。

输入：
[收入、毛利率、现金流、回款、客户、产品进度、团队变化、融资进展]

输出：
1. 本月经营摘要，不超过 200 字。
2. KPI 表：实际值、目标值、偏差、原因、负责人。
3. 异常指标：哪些指标偏离目标，是否需要预警。
4. 下月关键动作。
5. 需要投资人/董事会支持的资源。</code></pre>`,
  },
  {
    title: '投后异常识别：收入、费用、回款和团队风险预警清单',
    tagScene: 'post-investment',
    tagIndustry: null,
    tagContent: ['risk-id', 'data-clean', 'memo'],
    assetType: 'prompt',
    usageNotes: '适合根据月报、财务表和访谈纪要快速识别投后风险。',
    body: `<p>投后管理要尽早发现异常，而不是等到下一轮融资失败才反应。这个 Skill 用指标偏离和经营信号做预警。</p>
<pre><code>你是一位投后管理负责人。请基于以下月报/财务数据/访谈纪要识别异常。

材料：
[粘贴投后月报、财务表、会议纪要]

请输出：
1. 异常指标清单：收入、毛利率、费用率、现金流、回款、客户流失、团队变动。
2. 每个异常的可能原因：短期波动 / 结构性恶化 / 信息披露不足。
3. 风险等级：绿 / 黄 / 红。
4. 需要 CEO 补充解释的问题。
5. 需要董事会介入或投资人赋能的事项。
6. 下月必须跟踪的 5 个指标。</code></pre>`,
  },
  {
    title: '投后赋能动作设计：客户、招聘、融资和董事会资源匹配',
    tagScene: 'post-investment',
    tagIndustry: null,
    tagContent: ['automation', 'memo', 'info-gather'],
    assetType: 'workflow',
    usageNotes: '适合投资经理从“看月报”升级为“可执行赋能计划”。',
    body: `<p>投后赋能不是泛泛地说“帮忙介绍资源”，而是把公司当前瓶颈拆成可执行动作。</p>
<h2>赋能维度</h2>
<ul>
  <li>客户：目标名单、引荐优先级、试点路径</li>
  <li>招聘：关键岗位、候选人画像、面试参与方式</li>
  <li>融资：下一轮故事线、潜在投资人、数据补强</li>
  <li>治理：董事会议题、里程碑、风险处理</li>
</ul>
<pre><code>请为以下被投公司设计一份投后赋能动作计划。

输入：
[公司阶段、产品、客户、当前经营瓶颈、下月目标、投资人资源]

输出：
1. 当前最关键的 3 个瓶颈。
2. 每个瓶颈对应的赋能动作：客户、招聘、融资、PR、治理。
3. 每个动作的负责人、截止时间、成功标准。
4. 董事会需要讨论的议题。
5. 未来 30 天资源对接清单。</code></pre>`,
  },
  {
    title: 'LP 组合进展摘要：项目状态、估值变化、退出路径和风险更新',
    tagScene: 'fundraising',
    tagIndustry: null,
    tagContent: ['memo', 'report-gen', 'risk-id'],
    assetType: 'prompt',
    usageNotes: '适合季度 LP 沟通前，整理组合公司进展和风险变化。',
    body: `<p>LP 汇报不是罗列每个项目，而是让 LP 快速理解组合质量、变化和风险。这个 Prompt 会把项目进展压成可沟通摘要。</p>
<pre><code>你是一位基金 IR / 投资运营负责人。请基于以下组合公司材料生成 LP 组合进展摘要。

材料：
[粘贴项目列表、估值变化、融资进展、经营进展、退出可能性、风险事项]

请输出：
1. 组合总体摘要：本季度最重要的 3 个变化。
2. 项目分层：明星项目、稳健项目、需关注项目、风险项目。
3. 每个重点项目的进展、估值变化、下一里程碑和退出路径。
4. 需要主动披露的风险事项和建议表述。
5. LP 可能追问的问题和回答口径。</code></pre>`,
  },
  {
    title: 'LP 季报初稿生成器：基金表现、组合进展和 GP 观点',
    tagScene: 'fund-ops',
    tagIndustry: null,
    tagContent: ['report-gen', 'memo', 'company-profile'],
    assetType: 'template',
    usageNotes: '适合根据基金运营数据和项目更新生成 LP 季报初稿。',
    body: `<p>用于从基金运营数据和项目更新生成 LP 季报初稿，重点是正式、克制、信息密度高。</p>
<h2>季报模块</h2>
<ul>
  <li>基金表现：DPI、TVPI、IRR、现金流</li>
  <li>组合进展：重点项目、估值变化、融资和退出</li>
  <li>市场观察：GP 对行业和退出环境的判断</li>
  <li>风险披露：组合风险和管理动作</li>
</ul>
<pre><code>请根据以下材料起草 LP 季报。

输入：
[基金表现数据、组合公司更新、投资/退出事件、市场观察、风险事项]

输出：
1. 封面摘要，不超过 300 字。
2. 基金表现章节。
3. 组合公司进展章节。
4. 退出与后续融资章节。
5. GP 市场观点。
6. 风险提示和下一季度重点。
语气要求：正式、克制、透明，避免夸大。</code></pre>`,
  },
  {
    title: 'MCP Token 轮换与安全检查清单',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation', 'risk-id'],
    assetType: 'workflow',
    usageNotes: '适合团队内部管理 N.E.I. MCP Token 的生成、保存、轮换和泄露处理。',
    body: `<p>Token 是 MCP 访问凭证。这个流程用于把“生成 Token”变成可审计、可轮换、可撤销的团队动作。</p>
<h2>检查清单</h2>
<ol>
  <li>只在 N.E.I. /connect 页面生成 Token。</li>
  <li>只保存到信任的本地客户端或密码管理器。</li>
  <li>不得发到群聊、截图、共享文档或陌生 Agent。</li>
  <li>成员离职、设备丢失、怀疑泄露时立即重新生成。</li>
</ol>
<pre><code>请帮我检查 N.E.I. MCP Token 配置是否安全。

检查项：
- Token 是否只保存在可信客户端？
- 是否曾经通过群聊、截图、文档或不可信网页传播？
- 是否有团队成员离职或设备变更？
- 最近是否成功调用 list_my_skills？

请输出：
1. 当前风险等级。
2. 是否需要重新生成 Token。
3. 重新生成后的配置步骤。
4. 团队内部安全提醒文案。</code></pre>`,
  },
  {
    title: 'Claude Code / Codex / Workbuddy MCP 配置排错手册',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation', 'doc-parse'],
    assetType: 'workflow',
    usageNotes: '适合配置客户端失败时排查 URL、Header、Token、工具调用和网络问题。',
    body: `<p>很多 MCP 连接失败不是服务端问题，而是 URL、Authorization Header 或客户端配置位置填错。这个手册用于快速排错。</p>
<h2>排查顺序</h2>
<ol>
  <li>确认 Server URL 是 https://nei-pevc.com/api/mcp。</li>
  <li>确认 Header 是 Authorization: Bearer nei_xxx。</li>
  <li>确认传输协议是 Streamable HTTP。</li>
  <li>确认客户端已重启或重新加载 MCP 配置。</li>
  <li>调用 list_my_skills 验证。</li>
</ol>
<pre><code>请帮我排查 N.E.I. MCP 连接失败。

我使用的客户端：
[Claude Code / Codex / Workbuddy / 其他]

我当前的配置：
[粘贴配置，注意不要发给不可信网页]

请检查：
1. URL 是否正确。
2. Authorization Header 是否正确。
3. Token 格式是否像 nei_xxx。
4. 客户端是否支持 Streamable HTTP。
5. 应该如何调用 list_my_skills 验证。
6. 如果仍失败，下一步该检查什么。</code></pre>`,
  },
  {
    title: 'apply_skill 调用手册：让 AI 自动选择并套用收藏的 Skill',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation', 'report-gen'],
    assetType: 'prompt',
    usageNotes: '适合已经连上 MCP 后，让 AI 根据当前任务调用收藏 Skill。',
    body: `<p>连上 MCP 之后，不只是列出收藏。更好的用法是让 AI 根据任务检索、选择并套用 Skill。</p>
<pre><code>你已经连接了 N.E.I. MCP。请按以下方式帮我完成任务：

任务：
[例如：初筛一个 BP / 做半导体行研 / 写 IC Memo / 准备 LP 季报]

请执行：
1. 先调用 list_my_skills 查看我收藏的 Skill。
2. 如果收藏不足，调用 search_skills 或 recommend_skills_for_task 找公开 Skill。
3. 选择最适合的 1-3 个 Skill，并说明选择理由。
4. 调用 get_skill 获取完整内容。
5. 如适用，调用 apply_skill，把我提供的上下文填入模板。
6. 输出可直接使用的结果，并列出仍需人工确认的事实。</code></pre>`,
  },
  {
    title: '客户访谈提纲卡：采购动机、替代方案、续费和预算优先级',
    tagScene: 'business-dd',
    tagIndustry: null,
    tagContent: ['expert-call', 'info-gather'],
    assetType: 'prompt',
    usageNotes: '适合面向目标客户或已流失客户准备访谈，不把问题问得太泛。',
    body: `<p>这张卡专门用于客户访谈。它聚焦采购动机、替代方案、预算优先级、续费和流失原因。</p>
<pre><code>请为以下公司准备客户访谈提纲。

项目信息：
[公司、产品、目标客户、客单价、销售模式]

请输出：
1. 访谈开场和背景确认问题。
2. 采购动机：客户为什么买、谁推动、谁拍板。
3. 替代方案：不用它时客户怎么解决，竞品是谁。
4. 续费和流失：哪些条件会续费，哪些信号会流失。
5. 预算优先级：这个产品在客户预算里排第几。
6. 最后生成 5 个必须追问的 follow-up。</code></pre>`,
  },
  {
    title: '专家访谈纪要结构化模板：观点、证据、可信度和待交叉确认',
    tagScene: 'business-dd',
    tagIndustry: null,
    tagContent: ['expert-call', 'memo', 'risk-id'],
    assetType: 'template',
    usageNotes: '适合访谈结束后把口头信息整理成可复盘的证据表。',
    body: `<p>访谈结束后最重要的是区分观点和证据。这个模板把每条信息按可信度、来源和待确认事项整理。</p>
<pre><code>请把以下专家访谈纪要整理成结构化表格。

原始纪要：
[粘贴访谈纪要]

输出字段：
- 主题
- 专家原话
- 信息类型：事实 / 观点 / 传闻 / 推测
- 可信度：高 / 中 / 低
- 对投资判断的影响
- 需要交叉确认的对象或资料
- 下一步问题

最后输出 5 条最影响商业判断的结论。</code></pre>`,
  },
  {
    title: '董事会资源对接清单：客户、招聘、融资和治理议题',
    tagScene: 'post-investment',
    tagIndustry: null,
    tagContent: ['memo', 'automation', 'info-gather'],
    assetType: 'workflow',
    usageNotes: '适合董事会前准备资源对接和股东支持事项。',
    body: `<p>这不是月报模板，而是董事会前的资源清单。目标是把“需要支持”拆成具体动作。</p>
<pre><code>请为以下公司准备董事会资源对接清单。

输入：
[公司阶段、当前瓶颈、目标客户、关键岗位、融资计划、董事会成员资源]

请输出：
1. 客户资源：目标名单、介绍人、切入场景、预期结果。
2. 招聘资源：关键岗位、候选人画像、推荐渠道。
3. 融资资源：下一轮故事线、潜在投资人、需要补的数据。
4. 治理议题：董事会需要拍板或提醒的事项。
5. 每项资源的负责人和截止时间。</code></pre>`,
  },
  {
    title: '投后赋能复盘表：资源动作、完成度和实际效果',
    tagScene: 'post-investment',
    tagIndustry: null,
    tagContent: ['memo', 'data-clean'],
    assetType: 'template',
    usageNotes: '适合跟踪投资人承诺的资源是否真的产生效果。',
    body: `<p>很多资源对接没有复盘，最后不知道帮没帮上忙。这张表用于跟踪赋能动作的完成度和结果。</p>
<pre><code>请把以下资源动作整理成赋能复盘表。

输入：
[资源动作、对接对象、负责人、完成情况、公司反馈、结果数据]

输出字段：
- 资源类型：客户 / 招聘 / 融资 / 品牌 / 治理
- 动作描述
- 负责人
- 完成状态
- 公司反馈
- 实际效果
- 是否继续投入
- 下一步建议</code></pre>`,
  },
  {
    title: '组合项目进展更新模板：里程碑、估值变化、退出路径和风险事项',
    tagScene: 'fundraising',
    tagIndustry: null,
    tagContent: ['memo', 'report-gen', 'risk-id'],
    assetType: 'template',
    usageNotes: '适合把多个项目的进展整理成对外可沟通版本。',
    body: `<p>用于整理组合项目进展，不写基金整体表现，只写项目层面的变化。</p>
<pre><code>请把以下项目更新整理成组合项目进展摘要。

输入：
[项目名称、持股比例、最新估值、经营进展、融资进展、退出机会、风险事项]

请输出：
1. 项目分层：快速增长 / 稳定推进 / 需要关注 / 高风险。
2. 每个项目的本季度里程碑。
3. 估值变化和原因。
4. 退出路径：IPO、并购、老股转让、回购等可能性。
5. 需要对外谨慎表述的风险事项。</code></pre>`,
  },
  {
    title: '项目退出路径摘要：并购方、IPO 条件、老股转让和时间窗口',
    tagScene: 'fundraising',
    tagIndustry: null,
    tagContent: ['memo', 'info-gather'],
    assetType: 'prompt',
    usageNotes: '适合在投资人沟通中说明重点项目的退出可能性。',
    body: `<p>专门整理单个项目或一组项目的退出路径，避免只写“未来可 IPO”。</p>
<pre><code>请为以下项目整理退出路径摘要。

项目材料：
[公司业务、收入规模、利润情况、股东结构、同类交易、潜在买方]

请输出：
1. 可能退出路径：IPO / 并购 / 老股转让 / 回购。
2. 每条路径的前置条件。
3. 潜在买方或接盘方类型。
4. 时间窗口和关键里程碑。
5. 当前最大不确定性。</code></pre>`,
  },
  {
    title: '季报初稿撰写器：正式汇报语气、风险披露和 GP 观点',
    tagScene: 'fund-ops',
    tagIndustry: null,
    tagContent: ['report-gen', 'memo'],
    assetType: 'prompt',
    usageNotes: '适合把运营数据和项目更新转成正式季报语言。',
    body: `<p>用于生成季度报告初稿，强调正式、透明、克制，不做营销式夸张。</p>
<pre><code>请根据以下材料起草一份季度报告初稿。

材料：
[运营数据、项目更新、退出事件、风险事项、市场观察]

请输出：
1. 管理人致辞，不超过 300 字。
2. 本季度重点事件。
3. 项目更新章节。
4. 风险披露章节。
5. GP 观点：市场、退出、估值和下一季度重点。
6. 需要和投资人沟通确认的问题。</code></pre>`,
  },
  {
    title: '收藏 Skill 整理 SOP：按任务、频率和客户端调用方式分组',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation', 'memo'],
    assetType: 'workflow',
    usageNotes: '适合刚开始使用 N.E.I. 时整理自己的收藏库。',
    body: `<p>连接客户端前，先把收藏库整理好。否则 AI 读取收藏后也不知道哪些最常用。</p>
<pre><code>请帮我整理 N.E.I. 收藏库。

请按以下维度分组：
1. 任务：BP 初筛、行业研究、商业尽调、财务分析、IC、投后、LP。
2. 频率：每日、每周、项目制、偶尔使用。
3. 调用方式：直接复制、作为 Workflow、通过 MCP 调用。
4. 每组挑出 3 个最值得保留的 Skill。
5. 给出删除或归档建议。</code></pre>`,
  },
  {
    title: '我的收藏命名规范：让 list_my_skills 返回结果更好用',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation', 'doc-parse'],
    assetType: 'prompt',
    usageNotes: '适合团队统一收藏和命名习惯，让客户端更容易选择 Skill。',
    body: `<p>收藏很多以后，命名混乱会影响 AI 选择。这个 Prompt 用于给 Skill 做清晰命名和备注。</p>
<pre><code>请帮我为收藏的 Skill 制定命名和备注规范。

规则：
1. 标题包含任务场景，例如“BP 初筛”“IC Q&A”“LP 季报”。
2. 备注写明输入材料和输出结果。
3. 高频 Skill 加上“常用”标记。
4. 不同版本用 v1/v2 区分。
5. 过期或低质量 Skill 标记为待删除。</code></pre>`,
  },
  {
    title: 'Token 配置卡：复制 URL、Header 和验证命令',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation'],
    assetType: 'template',
    usageNotes: '适合生成 Token 后，把必要配置一次性复制到客户端。',
    body: `<p>这是一张最小配置卡，专门服务生成 Token 后的下一步。</p>
<pre><code>请按以下配置接入 N.E.I.：

Server name: nei-pevc
Transport: Streamable HTTP
URL: https://nei-pevc.com/api/mcp
Header: Authorization: Bearer [你的 Token]

接入后请调用：
list_my_skills

如果失败，请检查：
1. Token 是否完整。
2. Header 是否写成 Authorization。
3. Bearer 后是否有空格。
4. 客户端是否支持 Streamable HTTP。</code></pre>`,
  },
  {
    title: '客户端配置卡：Claude Code、Codex、Workbuddy 的 MCP Header 写法',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation', 'doc-parse'],
    assetType: 'template',
    usageNotes: '适合把同一套 MCP 配置放到不同客户端。',
    body: `<p>面向 Claude Code、Codex、Workbuddy 等 Agent 客户端的配置卡，重点是 URL 和 Header 不写错。</p>
<pre><code>{
  "mcpServers": {
    "nei-pevc": {
      "url": "https://nei-pevc.com/api/mcp",
      "headers": {
        "Authorization": "Bearer [你的 Token]"
      }
    }
  }
}

配置后：
1. 重启或刷新客户端。
2. 调用 list_my_skills。
3. 再调用 get_skill 或 apply_skill。</code></pre>`,
  },
  {
    title: 'MCP 工具调用演练：list_my_skills、get_skill、apply_skill 三步走',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation', 'report-gen'],
    assetType: 'workflow',
    usageNotes: '适合验证连接成功后，真正让 AI 用起来。',
    body: `<p>连接成功只是第一步。这个演练让客户端真正完成一次“查找收藏 → 获取原文 → 套用模板”。</p>
<pre><code>请使用 N.E.I. MCP 完成一次工具调用演练。

步骤：
1. 调用 list_my_skills，列出我的收藏。
2. 选择一个最适合当前任务的 Skill。
3. 调用 get_skill 获取完整原文。
4. 如这个 Skill 是模板或 Prompt，调用 apply_skill，把我的上下文填进去。
5. 输出最终结果，并列出哪些事实需要人工核查。

当前任务：
[填写你的任务]</code></pre>`,
  },
  {
    title: '季度报告成稿器：管理人致辞、重点事项和风险披露',
    tagScene: 'fund-ops',
    tagIndustry: null,
    tagContent: ['report-gen', 'memo', 'risk-id'],
    assetType: 'prompt',
    usageNotes: '适合把分散运营材料整理成正式季度报告初稿。',
    body: `<p>用于起草季度报告，不负责估值测算，重点是把已经确认的材料写成正式、克制、可交付的文本。</p>
<pre><code>请基于以下材料起草一份季度报告初稿。
输入：
[本季度重要事项、已确认数据、重点公司更新、风险事项、管理人观点]

输出结构：
1. 管理人致辞，控制在 300 字以内。
2. 本季度重点事项。
3. 已确认数据和口径说明。
4. 风险披露与后续观察。
5. 下季度重点工作。
6. 需要人工复核的事实清单。</code></pre>`,
  },
  {
    title: '季度报告风险披露写法：克制、透明、不营销',
    tagScene: 'fund-ops',
    tagIndustry: null,
    tagContent: ['risk-id', 'memo'],
    assetType: 'prompt',
    usageNotes: '适合把内部风险事项转成对外可沟通的季报语言。',
    body: `<p>用于把内部风险记录改写成季度报告里的风险披露段落，避免过度乐观，也避免制造不必要恐慌。</p>
<pre><code>请把以下风险事项改写成季度报告风险披露。
材料：
[风险事项、影响范围、当前处置、仍需观察的问题]

请输出：
1. 风险标题。
2. 对外披露表述，保持克制和透明。
3. 当前进展。
4. 后续观察指标。
5. 不建议写入报告的敏感表述。</code></pre>`,
  },
  {
    title: '出资人沟通邮件：季度更新、会前提醒和会后跟进',
    tagScene: 'fund-ops',
    tagIndustry: null,
    tagContent: ['memo', 'report-gen'],
    assetType: 'template',
    usageNotes: '适合准备季度汇报前后的正式沟通邮件。',
    body: `<p>用于准备季度沟通邮件，适合会前发送材料、会后同步结论或提醒待确认事项。</p>
<pre><code>请基于以下背景生成一封出资人沟通邮件。
背景：
[沟通目的、收件人类型、本季度重点、附件材料、需要对方确认的问题]

输出：
1. 邮件标题。
2. 正文，不超过 500 字。
3. 附件说明。
4. 需要对方确认的事项。
5. 会后跟进清单。</code></pre>`,
  },
  {
    title: '季度汇报会讲稿：10 分钟版本和 3 分钟版本',
    tagScene: 'fund-ops',
    tagIndustry: null,
    tagContent: ['report-gen', 'memo'],
    assetType: 'workflow',
    usageNotes: '适合把季度报告压缩成口头汇报稿。',
    body: `<p>用于把季度材料压缩成口头汇报，不追求华丽表达，重点是让听众快速抓住重点和后续动作。</p>
<pre><code>请把以下材料改写成季度汇报会讲稿。
材料：
[季度报告初稿、重点事项、风险事项、后续安排]

请输出：
1. 10 分钟讲稿。
2. 3 分钟压缩版讲稿。
3. 可能被追问的 5 个问题。
4. 每个问题的建议回答。
5. 不应在会上展开的敏感内容。</code></pre>`,
  },
  {
    title: '市场规模测算检查表：渗透率、客单价、保有量和增长驱动',
    tagScene: 'industry-research',
    tagIndustry: null,
    tagContent: ['data-clean', 'memo'],
    assetType: 'template',
    usageNotes: '适合复核 TAM/SAM/SOM 和市场规模假设是否站得住。',
    body: `<p>用于检查市场规模测算是否只是在堆假设，重点是拆出可验证变量和敏感性。</p>
<pre><code>请检查以下市场规模测算。
输入：[TAM/SAM/SOM、客单价、渗透率、客户数量、增长驱动、数据来源]

输出：
1. 关键变量清单。
2. 每个变量的可信度。
3. 最敏感的 3 个假设。
4. 自上而下和自下而上的交叉验证。
5. 需要补充的数据来源。</code></pre>`,
  },
  {
    title: '供应商访谈提纲：价格、账期、交付能力和替代关系',
    tagScene: 'business-dd',
    tagIndustry: null,
    tagContent: ['info-gather', 'memo'],
    assetType: 'prompt',
    usageNotes: '适合商业尽调中补齐供应链和交付侧访谈。',
    body: `<p>用于生成供应商访谈问题，重点验证目标公司的议价能力、交付稳定性和替代风险。</p>
<pre><code>请为以下公司生成供应商访谈提纲。
材料：[目标公司业务、采购品类、主要供应商、交付周期、历史异常]

请按以下模块输出：
1. 合作背景和订单变化。
2. 价格、账期和付款纪律。
3. 交付能力和质量稳定性。
4. 替代供应商和切换成本。
5. 需要交叉确认的问题。</code></pre>`,
  },
  {
    title: '毛利率与现金流桥：费用率、资本开支和营运资金变化',
    tagScene: 'financial',
    tagIndustry: null,
    tagContent: ['data-clean', 'risk-id'],
    assetType: 'workflow',
    usageNotes: '适合把利润表和现金流之间的差异解释清楚。',
    body: `<p>用于解释“账面利润不错但现金不好”或“现金改善但盈利承压”的原因。</p>
<pre><code>请基于以下财务数据生成毛利率与现金流桥。
输入：[毛利率、费用率、经营现金流、资本开支、应收、存货、应付]

输出：
1. 毛利率变化原因。
2. 费用率变化原因。
3. 经营现金流和净利润差异。
4. 营运资金变化解释。
5. 需要管理层回答的问题。</code></pre>`,
  },
  {
    title: '经营现金流异常复核：应收、存货、预收和付款节奏',
    tagScene: 'financial',
    tagIndustry: null,
    tagContent: ['risk-id', 'data-clean'],
    assetType: 'prompt',
    usageNotes: '适合复核企业现金流质量和短期压力。',
    body: `<p>用于检查经营现金流异常，尤其适合制造业、企业服务和渠道型业务。</p>
<pre><code>请复核以下经营现金流异常。
材料：[现金流量表、应收账款、存货、预收款、应付款、管理层解释]

请输出：
1. 异常项目排序。
2. 可能原因。
3. 对短期偿债和融资需求的影响。
4. 需要补充的明细。
5. 可接受解释与不可接受解释。</code></pre>`,
  },
  {
    title: '反方观点清单：为什么这个项目可能不成立',
    tagScene: 'ic',
    tagIndustry: null,
    tagContent: ['risk-id', 'memo'],
    assetType: 'prompt',
    usageNotes: '适合在投委会前主动打穿项目逻辑。',
    body: `<p>用于生成反方观点，不追求唱反调，而是把最可能导致判断失误的点提前摆出来。</p>
<pre><code>请为以下项目生成反方观点清单。
材料：[项目摘要、增长逻辑、竞争优势、财务数据、尽调结论]

输出：
1. 最强的 5 个反方观点。
2. 每个观点需要什么证据才能反驳。
3. 当前材料里最薄弱的环节。
4. 缓释方案。
5. 是否影响继续推进。</code></pre>`,
  },
  {
    title: '核心风险缓释表：技术、市场、团队、估值和退出',
    tagScene: 'ic',
    tagIndustry: null,
    tagContent: ['risk-id', 'memo'],
    assetType: 'template',
    usageNotes: '适合把风险从散点整理成可讨论的投委会材料。',
    body: `<p>用于把核心风险整理成表格，避免只写“存在不确定性”。</p>
<pre><code>请把以下项目材料整理成核心风险缓释表。
输入：[项目材料、尽调发现、管理层解释、第三方证据]

字段：
- 风险类别
- 风险描述
- 发生概率
- 影响程度
- 当前证据
- 缓释动作
- 投后跟踪指标</code></pre>`,
  },
  {
    title: '投委会高压追问库：估值、竞争、增长和退出',
    tagScene: 'ic',
    tagIndustry: null,
    tagContent: ['memo'],
    assetType: 'prompt',
    usageNotes: '适合路演或投委会前做问答预演。',
    body: `<p>用于生成投委会可能追问，重点覆盖估值、竞争、增长质量和退出路径。</p>
<pre><code>请为以下项目生成投委会高压追问库。
材料：[项目摘要、投资建议、财务预测、估值、退出路径]

输出：
1. 20 个追问。
2. 每个追问背后的真实担忧。
3. 建议回答口径。
4. 需要补充的数据。
5. 不建议当场承诺的事项。</code></pre>`,
  },
  {
    title: '异常信号清单：费用、回款、团队和交付风险',
    tagScene: 'post-investment',
    tagIndustry: null,
    tagContent: ['risk-id', 'memo'],
    assetType: 'template',
    usageNotes: '适合投后跟踪时快速识别需要升级的问题。',
    body: `<p>用于把零散异常整理成可升级、可跟踪、可复盘的风险清单。</p>
<pre><code>请把以下材料整理成异常信号清单。
材料：[费用变化、回款记录、团队变动、客户投诉、交付延期]

输出：
1. 异常信号。
2. 影响范围。
3. 可信度。
4. 建议升级对象。
5. 下次复核时间。</code></pre>`,
  },
  {
    title: '风险预警会议纪要：问题、责任人和截止时间',
    tagScene: 'post-investment',
    tagIndustry: null,
    tagContent: ['risk-id', 'memo'],
    assetType: 'template',
    usageNotes: '适合把风险沟通会转成可执行纪要。',
    body: `<p>用于把风险预警会议整理成行动项，而不是停留在“持续关注”。</p>
<pre><code>请根据以下会议记录生成风险预警会议纪要。
输入：[会议记录、问题背景、相关数据、参会人意见]

输出：
1. 已确认问题。
2. 仍待确认问题。
3. 责任人。
4. 截止时间。
5. 下一次检查材料。</code></pre>`,
  },
  {
    title: '资源对接作战表：客户引荐、招聘候选人和融资名单',
    tagScene: 'post-investment',
    tagIndustry: null,
    tagContent: ['memo', 'automation'],
    assetType: 'workflow',
    usageNotes: '适合把投后支持拆成明确动作。',
    body: `<p>用于把“我们能帮忙”变成具体资源动作，便于投资团队和被投公司共同推进。</p>
<pre><code>请为以下公司生成资源对接作战表。
输入：[公司阶段、当前瓶颈、目标客户、关键岗位、融资计划、股东资源]

输出：
1. 客户引荐动作。
2. 招聘候选人画像和来源。
3. 融资名单和触达顺序。
4. 每项动作的负责人。
5. 两周内可完成事项。</code></pre>`,
  },
  {
    title: '季报数据口径复核：估值、现金流、重大事项和披露边界',
    tagScene: 'fund-ops',
    tagIndustry: null,
    tagContent: ['data-clean', 'report-gen'],
    assetType: 'workflow',
    usageNotes: '适合在季度报告成稿前统一数据口径。',
    body: `<p>用于成稿前检查季报里的数据口径，减少前后不一致和不该披露的信息。</p>
<pre><code>请复核以下季报数据口径。
材料：[估值表、现金流记录、重大事项、披露限制、历史报告]

输出：
1. 数据口径冲突。
2. 必须人工确认的数据。
3. 不建议披露的信息。
4. 可以合并表达的段落。
5. 最终成稿前检查清单。</code></pre>`,
  },
  {
    title: 'get_skill 原文读取检查：确认版本、边界和输入材料',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation'],
    assetType: 'prompt',
    usageNotes: '适合在客户端调用工具后确认拿到的原文是否能直接使用。',
    body: `<p>用于读取 get_skill 结果后做一次快速检查，避免拿错版本或忽略使用边界。</p>
<pre><code>请检查以下 get_skill 返回内容。
输入：[工具返回的标题、正文、使用说明、边界提示]

输出：
1. 这个工具适合完成什么任务。
2. 需要准备哪些输入材料。
3. 有哪些使用边界。
4. 是否需要人工复核。
5. 下一步应该如何填入上下文。</code></pre>`,
  },
  {
    title: 'apply_skill 输出复核：事实、口径、遗漏和下一步',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation', 'risk-id'],
    assetType: 'workflow',
    usageNotes: '适合在客户端套用工具后检查输出是否可交付。',
    body: `<p>用于调用 apply_skill 后复核结果，确保不是看起来完整但事实和口径没对齐。</p>
<pre><code>请复核以下 apply_skill 输出。
输入：[任务背景、原始材料、工具输出]

输出：
1. 事实是否有来源。
2. 口径是否前后一致。
3. 是否遗漏关键问题。
4. 哪些结论需要人工确认。
5. 可直接交付版本。</code></pre>`,
  },
  {
    title: '工具调用记录模板：查询、读取、套用和人工确认',
    tagScene: 'crm',
    tagIndustry: null,
    tagContent: ['automation', 'memo'],
    assetType: 'template',
    usageNotes: '适合记录一次客户端工具调用过程，方便团队复盘。',
    body: `<p>用于把一次工具调用过程记录下来，方便复用、复盘和安全检查。</p>
<pre><code>请把以下工具调用过程整理成记录。
材料：[查询词、选中的工具、读取内容、套用结果、人工修改]

输出：
1. 查询目标。
2. 选中原因。
3. 套用输入。
4. 输出结果。
5. 人工确认事项。</code></pre>`,
  },
];

async function ensureLibraryUser() {
  const existing = await prisma.user.findUnique({ where: { email: LIBRARY_EMAIL } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: LIBRARY_EMAIL,
      nickname: 'N.E.I. Skill 图书馆',
      role: 'RESEARCH',
      passwordHash: null,
      institution: 'N.E.I.',
      bio: 'N.E.I. 官方整理的 PEVC Skill / Workflow。',
    },
  });
}

async function main() {
  const user = await ensureLibraryUser();
  let created = 0;
  let skipped = 0;

  for (const skill of SKILLS) {
    const duplicate = await prisma.post.findFirst({ where: { title: skill.title } });
    if (duplicate) {
      skipped += 1;
      console.log(`skip #${duplicate.id} ${skill.title}`);
      continue;
    }

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        title: skill.title,
        body: `${skill.body}\n<!-- bundle-fill:v1 -->`,
        tagScene: skill.tagScene,
        tagIndustry: skill.tagIndustry,
        tagContent: JSON.stringify(skill.tagContent),
        tagSkill: skill.assetType,
        status: SEED_STATUS,
        mcpApproved: false,
        securityLevel: 'safe',
        featured: false,
        reviewFlag: SEED_REVIEW_FLAG,
        skillAsset: {
          create: {
            assetType: skill.assetType,
            originalAuthor: 'N.E.I. Editorial',
            sourceUrl: 'https://nei-pevc.com',
            installHint: skill.installHint ?? '可直接复制 Prompt 使用；也可收藏后通过 N.E.I. MCP 调用。',
            usageNotes: skill.usageNotes,
          },
        },
      },
    });

    created += 1;
    console.log(`created #${post.id} ${skill.tagScene} | ${skill.title}`);
  }

  console.log(`done created=${created} skipped=${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

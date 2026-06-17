/**
 * 第四批种子内容：PEVC 高频场景 Prompt + 方法论（社区原创，凑到 40+）
 *
 * 这些是根据 PEVC 真实工作场景原创编写的 Prompt 和方法论，
 * 不涉及第三方版权。标注 originalAuthor: 'PEVC 社区'。
 *
 * 用法：npx tsx scripts/import-batch4.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LIBRARY_EMAIL = 'library@pevc.local';

type NewSkill = {
  title: string;
  body: string;
  tagScene: string;
  tagIndustry?: string | null;
  tagContent: string[];
  tagSkill: string;
  originalAuthor: string;
  sourceUrl?: string;
  license: string;
  installHint?: string;
  usageNotes?: string;
};

const SKILLS: NewSkill[] = [
  // ===== 13. 尽调问题清单 Prompt =====
  {
    title: '尽调提问清单 Prompt：按赛道自动生成尽调问题列表',
    body: `<p>拿到一个项目，不知道该问创始人什么？这个 Prompt 让 AI 按<strong>投资人的尽调逻辑</strong>，针对具体赛道生成一份结构化的尽调问题清单。</p>
<h2>Prompt 全文</h2>
<pre>你是一位有 10 年经验的一级市场投资人。我正在看一个「[填入赛道/行业]」的项目，处于「[填入阶段：天使/Pre-A/A轮/B轮]」。

请帮我生成一份针对这个赛道的尽调问题清单，按以下模块组织：

## 1. 业务与产品
- 产品/服务的核心价值主张
- 技术壁垒和差异化
- 产品 roadmap 和迭代节奏

## 2. 市场与竞争
- 市场规模的真实性（TAM/SAM/SOM）
- 竞争对手的详细对比
- 客户获取成本和渠道

## 3. 财务数据
- 收入结构和确认方式
- 核心单位经济（LTV/CAC/毛利率）
- 现金流状况和烧钱速度

## 4. 团队与组织
- 创始团队背景核实
- 核心岗位的完整性
- 股权结构

## 5. 法律与合规
- 这个赛道特有的监管风险
- 知识产权归属
- 数据合规

## 6. 红旗信号
列出这个赛道/阶段最需要警惕的 5 个红旗信号。

每个模块 5-8 个问题，问题要具体、可执行，不要泛泛而谈。</pre>
<h2>怎么用</h2>
<ol>
<li>复制 Prompt，粘贴到 AI 对话框</li>
<li>填入赛道和融资阶段</li>
<li>拿到问题清单后，按需筛选用于创始人访谈</li>
</ol>`,
    tagScene: 'business-dd',
    tagContent: ['info-gather', 'risk-id'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '复制 Prompt → 粘贴到 AI → 填入赛道和阶段 → 生成尽调问题清单。',
    usageNotes: '适合拿到新项目后、准备创始人访谈/尽调会议前使用。',
  },

  // ===== 14. IC Memo 写作 Prompt =====
  {
    title: 'IC Memo Prompt：把尽调结论结构化成投资建议书',
    body: `<p>项目看完要上 IC，但 memo 写得乱七八糟？这个 Prompt 帮你把零散的尽调笔记<strong>结构化成一份标准的 IC 投资建议书</strong>。</p>
<h2>Prompt 全文</h2>
<pre>你是投委会秘书。我把尽调过程中收集的零散信息发给你，请帮我整理成一份结构化的 IC 投资建议书。

项目名称：[填入]
投资金额/轮次：[填入]

我的零散笔记：
[粘贴你的尽调笔记、会议纪要、数据等]

请按以下结构输出 IC Memo：

# 投资建议书：[项目名]

## 执行摘要（300字以内）
一句话推荐结论 + 核心理由

## 投资亮点（3-5条）
这个项目最打动我们的点

## 业务分析
- 商业模式
- 市场机会
- 竞争优势

## 财务概况
- 历史财务表现
- 核心指标
- 估值与交易结构

## 风险因素（3-5条）
主要风险及缓释措施

## 投资建议
推荐/不推荐/有条件推荐，附条件

格式要求：专业、简洁、有数据支撑。不确定的标"待核实"。</pre>
<h2>怎么用</h2>
<ol>
<li>把你的尽调笔记/会议纪要整理好</li>
<li>复制 Prompt，粘贴笔记到指定位置</li>
<li>AI 输出结构化 IC Memo 初稿，你再修改定稿</li>
</ol>`,
    tagScene: 'ic',
    tagContent: ['memo', 'report-gen'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '粘贴尽调笔记 → AI 生成结构化 IC Memo 初稿 → 修改定稿。',
    usageNotes: '适合项目上 IC 前整理 memo。产出是初稿，需人工审核修改。',
  },

  // ===== 15. 竞品分析 Prompt =====
  {
    title: '竞品分析 Prompt：一键生成赛道竞争格局对比表',
    body: `<p>看一个项目，需要快速了解它的竞争对手。这个 Prompt 让 AI 帮你<strong>梳理赛道竞争格局，生成竞品对比表</strong>。</p>
<h2>Prompt 全文</h2>
<pre>你是一位行业研究员。请帮我分析「[填入公司/产品名]」所在赛道的竞争格局。

目标公司：[填入]
赛道：[填入]

请输出：

## 1. 竞品清单
列出 5-8 个直接/间接竞品，标注：
- 公司名 | 融资阶段/估值 | 核心产品 | 目标客户 | 差异化

## 2. 竞品对比表
用 Markdown 表格，按以下维度横向对比：
| 维度 | 目标公司 | 竞品A | 竞品B | ... |
维度包括：产品形态、定价、目标客户、技术路线、融资阶段、团队规模

## 3. 定位图
用文字描述一个二维定位图（X轴/Y轴），把各竞品放进去

## 4. 竞争判断
- 这个赛道的竞争激烈程度
- 目标公司的竞争位置（头部/挑战者/跟随者）
- 最大的竞争威胁来自谁

数据查不到标"未查到"，不要编。</pre>
<h2>怎么用</h2>
<ol>
<li>复制 Prompt，填入目标公司和赛道</li>
<li>粘贴到 AI 对话框</li>
<li>拿到竞品分析初稿，用搜索工具补充最新数据</li>
</ol>`,
    tagScene: 'industry-research',
    tagContent: ['competitive-map', 'report-gen'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '填入目标公司和赛道 → AI 生成竞品对比表和定位图 → 补充最新数据。',
    usageNotes: '适合行业研究和项目初筛阶段。AI 产出的数据需要核实。',
  },

  // ===== 16. 会议纪要 Prompt =====
  {
    title: '会议纪要 Prompt：创始人访谈/专家访谈/IC会议自动整理',
    body: `<p>开完一场创始人访谈或专家访谈，录音转文字后还要花一小时整理纪要？这个 Prompt 让 AI <strong>自动从访谈文字稿提取关键信息</strong>，生成结构化纪要。</p>
<h2>Prompt 全文</h2>
<pre>你是一位投研助理。下面是一场「[填入：创始人访谈/专家访谈/IC会议]」的文字记录。请帮我整理成结构化会议纪要。

会议信息：
- 日期：[填入]
- 参与人：[填入]
- 主题：[填入]

文字记录：
[粘贴录音转文字内容]

请按以下结构输出纪要：

## 会议摘要（200字以内）
核心结论和关键信息点

## 关键信息点
按主题归类，每条标注发言人：
- 业务/产品相关信息
- 市场/竞争相关信息
- 财务/估值相关信息
- 团队相关信息
- 其他重要信息

## 待办事项
列出会议中提到的 action items，标注负责人

## 值得追问的问题
列出 3-5 个这次会议没说清楚、值得后续跟进的问题

格式：简洁、要点式。保留原话中的关键数字和判断。</pre>
<h2>怎么用</h2>
<ol>
<li>会议录音用飞书妙记/通义听悟等转成文字</li>
<li>复制 Prompt，粘贴文字稿</li>
<li>AI 输出结构化纪要，检查后归档</li>
</ol>`,
    tagScene: 'crm',
    tagContent: ['report-gen'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '录音转文字 → 粘贴文字稿 → AI 生成结构化纪要 → 检查归档。',
    usageNotes: '适合创始人访谈、专家访谈、IC 会议的纪要整理。',
  },

  // ===== 17. 项目初筛 Prompt =====
  {
    title: '项目初筛 Prompt：3 分钟判断一个项目值不值得深看',
    body: `<p>每天收到一堆 BP，不可能每个都深看。这个 Prompt 让 AI <strong>快速扫描 BP/teaser，按投资标准做 pass/fail 初判</strong>，帮你筛出值得花时间的项目。</p>
<h2>Prompt 全文</h2>
<pre>你是一位投资经理，正在做项目初筛。下面是一份项目的 BP/teaser 摘要。请帮我快速判断值不值得深看。

我的基金投资标准：
- 阶段：[填入，如 Pre-A/A轮]
- 赛道：[填入，如 AI/企业服务/消费]
- 单笔金额：[填入]
- 地域：[填入]

项目信息：
[粘贴 BP/teaser 内容]

请输出：

## 初筛结论
🟢 值得深看 / 🟡 有条件关注 / 🔴 暂不推荐

## 匹配度评估
按以下维度打分（1-5分）并一句话理由：
- 赛道匹配
- 阶段匹配
- 团队亮点
- 业务数据
- 退出可能性

## 亮点（如果有）
这个项目最吸引人的 1-2 个点

## 红旗（如果有）
明显的风险信号

## 建议
- 如果值得深看：建议优先了解的 3 个问题
- 如果暂不推荐：一句话理由</pre>
<h2>怎么用</h2>
<ol>
<li>填入你的基金投资标准</li>
<li>粘贴项目 BP/teaser 内容</li>
<li>AI 给出初筛结论，你再人工判断</li>
</ol>`,
    tagScene: 'screening',
    tagContent: ['risk-id', 'memo'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '填入投资标准 + 粘贴 BP → AI 给 pass/fail 初判和评分。',
    usageNotes: '适合 deal flow 初筛。AI 结论仅供参考，最终判断需人工。',
  },

  // ===== 18. 估值速算 Prompt =====
  {
    title: '估值速算 Prompt：快速估算一个早期项目的合理估值区间',
    body: `<p>早期项目没有财务数据做 DCF，估值往往是拍脑袋。这个 Prompt 用<strong>可比交易法 + 行业 benchmark</strong> 帮你快速估算一个合理估值区间。</p>
<h2>Prompt 全文</h2>
<pre>你是一位有丰富早期投资经验的估值顾问。请帮我估算以下项目的合理估值区间。

项目信息：
- 赛道：[填入]
- 阶段：[填入，如 Pre-A]
- 年收入/ARR：[填入]
- 增速（YoY）：[填入]
- 毛利率：[填入]
- 团队规模：[填入]
- 融资金额需求：[填入]

请用以下方法交叉验证估值：

## 方法一：可比交易法
列出近 12 个月同赛道同阶段的 3-5 笔融资交易（如能查到），
计算平均估值倍数（P/S 或 P/ARR），套用到目标公司。

## 方法二：行业 benchmark
这个赛道、这个阶段的典型估值区间是多少？
（参考 IT 桔子/ Crunchbase 等公开数据）

## 方法三：稀释法
按融资金额和合理的股权稀释比例（15-25%）反推投后估值。

## 综合判断
- 合理估值区间：[下限] - [上限]
- 推荐报价及理由
- 哪些因素会让估值偏高/偏低

注意：数据查不到标"未查到"，不要编。早期估值有很大的主观成分，这只是参考。</pre>
<h2>怎么用</h2>
<ol>
<li>填入项目的基本信息和财务数据</li>
<li>AI 用三种方法交叉估算</li>
<li>拿到估值区间，结合你的判断做决策</li>
</ol>`,
    tagScene: 'financial',
    tagContent: ['report-gen', 'data-clean'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '填入项目信息 → AI 用可比交易/benchmark/稀释法三种方法估算估值区间。',
    usageNotes: '适合早期项目估值参考。三种方法交叉验证，但最终估值需结合判断。',
  },

  // ===== 19. 投后监控 Prompt =====
  {
    title: '投后监控 Prompt：按月/季自动整理被投公司经营报告',
    body: `<p>投后管理最烦的就是每月催被投公司交报表、然后手动整理对比。这个 Prompt 帮你<strong>从被投公司提交的零散数据，自动生成结构化的投后经营报告</strong>。</p>
<h2>Prompt 全文</h2>
<pre>你是投后管理助理。下面是被投公司「[填入公司名]」本月提交的经营数据。请帮我整理成结构化的投后月报。

被投公司提交的数据：
[粘贴被投公司提交的零散数据/邮件/报表]

请输出：

# [公司名] 投后月报 | [年月]

## 核心指标速览
| 指标 | 本月 | 上月 | 环比 | 同比 | 全年目标 | 达成率 |
（收入/DAU/客户数/GMV 等核心指标）

## 经营亮点
本月最重要的 2-3 个进展

## 风险预警
- 指标异常（大幅下滑/未达标）
- 现金流预警（剩余跑道月数）
- 其他风险信号

## 需要关注的点
列出 3 个本月需要跟创始人重点沟通的问题

## 下月关注
下月的关键节点/里程碑

格式：简洁，数据驱动。数据缺失标"未提交"。</pre>
<h2>怎么用</h2>
<ol>
<li>把被投公司提交的数据（邮件/Excel 截图/文字）整理好</li>
<li>粘贴到 Prompt 指定位置</li>
<li>AI 生成投后月报，检查后归档/分发</li>
</ol>`,
    tagScene: 'post-investment',
    tagContent: ['report-gen', 'data-clean'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '粘贴被投公司数据 → AI 生成结构化投后月报 → 检查归档。',
    usageNotes: '适合投后管理团队的月度/季度报告整理。',
  },

  // ===== 20. 专家访谈准备 Prompt =====
  {
    title: '专家访谈 Prompt：自动生成访谈提纲 + 关键问题清单',
    body: `<p>约了一个行业专家做访谈，但不知道该问什么？这个 Prompt 根据<strong>你的研究目的和专家背景</strong>，自动生成一份专业的访谈提纲。</p>
<h2>Prompt 全文</h2>
<pre>你是投研团队的访谈策划。我约了一位行业专家做访谈，请帮我设计访谈提纲。

访谈背景：
- 研究目的：[填入，如"了解XX赛道的竞争格局"/"验证XX技术路线的可行性"]
- 专家背景：[填入，如"XX公司前CTO"/"XX赛道连续创业者"]
- 访谈时长：[填入，如 45 分钟]
- 我的已有认知：[简述你已经了解的信息，避免重复问]

请输出访谈提纲：

## 开场（5分钟）
简短的破冰和背景介绍话术

## 核心问题（25-30分钟）
按主题分组，每组 2-3 个问题：
- 问题要开放式的（不是是非题）
- 从宏观到微观递进
- 标注每个问题的"想获取什么信息"

## 深挖问题（10分钟）
根据专家可能的回答方向，准备 3-4 个追问方向

## 收尾（5分钟）
总结确认 + 后续跟进方式

每个问题标注预期获取的信息类型。避免问可以百度到的常识问题。</pre>
<h2>怎么用</h2>
<ol>
<li>填入研究目的、专家背景、时长</li>
<li>AI 生成结构化访谈提纲</li>
<li>打印出来，访谈时参考</li>
</ol>`,
    tagScene: 'business-dd',
    tagContent: ['expert-call', 'info-gather'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '填入研究目的和专家背景 → AI 生成访谈提纲 → 打印参考。',
    usageNotes: '适合行业研究、尽调阶段的专家访谈准备。',
  },

  // ===== 21. 邮件写作 Prompt =====
  {
    title: '商务邮件 Prompt：创始人开发信 / LP 沟通 / 被投公司跟进',
    body: `<p>写创始人开发信、LP 季度沟通、被投公司跟进邮件，每次都要斟酌措辞。这个 Prompt 帮你<strong>快速生成得体的商务邮件</strong>。</p>
<h2>Prompt 全文</h2>
<pre>你是一位资深投资人，擅长商务沟通。请帮我写一封邮件。

邮件类型：[填入：创始人开发信 / LP季度沟通 / 被投公司跟进 / 拒绝信]
收件人：[填入]
核心目的：[填入，一句话]
关键信息点：
- [要点1]
- [要点2]
- [要点3]
语气：[专业但亲和 / 正式 / 诚恳]
字数：[填入，如 200字]

要求：
- 邮件主题要简洁有信息量（不是"您好"）
- 开头直接说目的，不要绕弯
- 段落短，每段一个要点
- 结尾有明确的下一步行动
- 不要用"赋能""抓手"这类空话</pre>
<h2>怎么用</h2>
<ol>
<li>选邮件类型，填入收件人和核心目的</li>
<li>列出要传达的关键信息点</li>
<li>AI 生成邮件，微调后发送</li>
</ol>`,
    tagScene: 'sourcing',
    tagContent: ['report-gen'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '选邮件类型 + 填关键信息 → AI 生成得体商务邮件 → 微调发送。',
    usageNotes: '适合创始人开发信、LP 沟通、被投跟进等各类商务邮件。',
  },

  // ===== 22. 数据清洗 Prompt =====
  {
    title: '数据清洗 Prompt：把杂乱的表格/数据整理成规范格式',
    body: `<p>从各处搜集来的数据格式乱七八糟——有的用万、有的用亿、日期格式不一、有空行空列。这个 Prompt 让 AI 帮你<strong>快速规范数据格式</strong>。</p>
<h2>Prompt 全文</h2>
<pre>你是数据处理专家。下面是一份杂乱的数据（粘贴自 Excel/CSV/网页），请帮我清洗和规范化。

原始数据：
[粘贴数据]

清洗要求：
1. 统一数字单位（全部转为"万元"或全部转为"元"）
2. 统一日期格式（YYYY-MM-DD）
3. 去除空行空列
4. 统一名称（如"有限公司"和"有限责任公司"统一）
5. 标记异常值（明显不合理的数据）

请输出：
## 清洗后的数据
用 Markdown 表格输出

## 异常值标记
列出清洗过程中发现的异常数据及处理方式

## 数据说明
数据覆盖的时间范围、口径说明</pre>
<h2>怎么用</h2>
<ol>
<li>从 Excel/CSV/网页复制杂乱数据</li>
<li>粘贴到 Prompt</li>
<li>AI 输出规范化的 Markdown 表格，复制回 Excel</li>
</ol>`,
    tagScene: 'financial',
    tagContent: ['data-clean'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '粘贴杂乱数据 → AI 清洗为规范格式 → 复制回 Excel。',
    usageNotes: '适合处理从多来源汇总的数据表格。',
  },

  // ===== 23. BP 解读 Prompt =====
  {
    title: 'BP 快速解读 Prompt：5 分钟拆解一份商业计划书的核心信息',
    body: `<p>收到一份几十页的 BP，没时间细看？这个 Prompt 帮你<strong>5 分钟提取 BP 的核心信息</strong>，快速判断是否值得深看。</p>
<h2>Prompt 全文</h2>
<pre>你是投资经理。请帮我快速拆解这份商业计划书的核心信息。

[粘贴 BP 内容/关键页面文字]

请输出一份 BP 解读摘要：

## 一句话总结
这个公司在做什么 + 解决什么问题

## 商业模式
- 怎么赚钱的
- 目标客户是谁
- 核心竞争力

## 团队
- 创始人背景（只摘关键）
- 团队完整度判断

## 数据亮点
BP 中提到的核心数据（收入/用户/增速等），标注是否可信

## 融资信息
- 融资金额/估值（如 BP 中提到）
- 资金用途

## 我的判断
- BP 的质量（逻辑清晰度/数据充分度）：1-5分
- 最吸引人的点
- 最大的疑问/需要验证的点
- 建议：值得深看 / 需要补充信息 / 暂不关注</pre>
<h2>怎么用</h2>
<ol>
<li>复制 BP 的文字内容（或关键页面）</li>
<li>粘贴到 Prompt</li>
<li>AI 输出结构化解读摘要</li>
</ol>`,
    tagScene: 'screening',
    tagContent: ['doc-parse', 'memo'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '粘贴 BP 内容 → AI 5分钟拆解核心信息 → 判断是否值得深看。',
    usageNotes: '适合 deal flow 初筛阶段快速判断项目。',
  },

  // ===== 24. LP 汇报 Prompt =====
  {
    title: 'LP 季度汇报 Prompt：自动生成给 LP 的季度基金运营报告',
    body: `<p>每季度要给 LP 写运营报告，格式固定但数据整理耗时。这个 Prompt 帮你<strong>从零散的基金数据生成结构化的 LP 季度报告</strong>。</p>
<h2>Prompt 全文</h2>
<pre>你是基金IR。请帮我生成本季度的 LP 运营报告。

基金信息：
- 基金名称：[填入]
- 报告期：[填入，如 2026 Q2]
- 基金规模/已投金额：[填入]

本季度关键数据：
[粘贴：新投项目/退出项目/估值变化/基金净值等]

请输出：

# [基金名] 2026 Q2 季度报告

## 基金概览
- 基金规模 / 已投 / 剩余可投
- 投资组合公司数量
- 基金净值（NAV）及环比变化

## 本季度投资动态
- 新投项目（名称/金额/轮次/赛道）
- 跟投项目
- 退出/部分退出

## 投资组合表现
- 整体估值变化
- 标杆项目进展
- 需关注的风险项目

## 市场展望
下季度的投资重点和市场判断

语气：专业、透明、不回避问题。数据驱动。</pre>
<h2>怎么用</h2>
<ol>
<li>整理本季度的基金关键数据</li>
<li>粘贴到 Prompt</li>
<li>AI 生成 LP 报告初稿，审核后发送</li>
</ol>`,
    tagScene: 'fundraising',
    tagContent: ['report-gen'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '粘贴季度基金数据 → AI 生成 LP 报告初稿 → 审核发送。',
    usageNotes: '适合基金 IR 团队的季度 LP 报告撰写。',
  },

  // ===== 25. 路演材料 Prompt =====
  {
    title: 'FA 路演材料 Prompt：从项目信息生成买方推介材料框架',
    body: `<p>做 FA 卖项目，路演材料（teaser/CIM）的框架搭建很费时间。这个 Prompt 帮你<strong>从项目基本信息生成路演材料的完整框架</strong>。</p>
<h2>Prompt 全文</h2>
<pre>你是资深 FA。请帮我从以下项目信息，生成一份路演推介材料的框架。

项目信息：
- 公司名称：[填入]
- 赛道：[填入]
- 融资轮次/金额：[填入]
- 核心数据：[填入关键经营数据]

请输出路演材料（Teaser + CIM）的框架：

## Teaser（匿名一页纸）
- 行业定位（不露公司名）
- 核心数据亮点（3-5个）
- 投资亮点（3条）
- 适合的买家画像

## CIM 框架（完整推介材料目录）
1. 执行摘要
2. 投资亮点
3. 公司概况
4. 行业机会
5. 商业模式
6. 竞争优势
7. 历史财务
8. 未来预测
9. 团队
10. 交易结构

每个章节标注：需要填充什么数据/图表

## 买家清单建议
3-5 类潜在买家（战略/财务），每类举例</pre>
<h2>怎么用</h2>
<ol>
<li>填入项目基本信息</li>
<li>AI 生成路演材料框架</li>
<li>按框架填充实际数据和图表</li>
</ol>`,
    tagScene: 'fundraising',
    tagContent: ['report-gen', 'memo'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    license: 'CC0-1.0',
    installHint: '填入项目信息 → AI 生成 teaser + CIM 框架 + 买家清单 → 填充数据。',
    usageNotes: '适合 FA 做卖方项目时的路演材料准备。',
  },
];

async function main() {
  const author = await prisma.user.findUnique({ where: { email: LIBRARY_EMAIL } });
  if (!author) {
    console.error('❌ 找不到 library 用户');
    process.exit(1);
  }

  let ok = 0;
  let skip = 0;
  for (const s of SKILLS) {
    const dup = await prisma.post.findFirst({ where: { title: s.title } });
    if (dup) {
      console.log(`⏭️  已存在: ${s.title.slice(0, 30)}...`);
      skip++;
      continue;
    }

    const body = s.body + (s.sourceUrl ? `
<hr>
<p style="font-size:12px;color:#8b7355">
📦 <strong>来源</strong>：${s.sourceUrl}<br>
📜 <strong>许可</strong>：${s.license}
</p>` : `
<hr>
<p style="font-size:12px;color:#8b7355">
✍️ <strong>作者</strong>：${s.originalAuthor} · ${s.license === 'CC0-1.0' ? '公共领域，可自由使用' : s.license}
</p>`);

    const post = await prisma.post.create({
      data: {
        userId: author.id,
        title: s.title,
        body,
        tagScene: s.tagScene,
        tagIndustry: s.tagIndustry ?? null,
        tagContent: JSON.stringify(s.tagContent),
        tagSkill: s.tagSkill,
        status: 'published',
        skillAsset: {
          create: {
            assetType: s.tagSkill,
            originalAuthor: s.originalAuthor,
            sourceUrl: s.sourceUrl || null,
            installHint: s.installHint || null,
            usageNotes: s.usageNotes || null,
          },
        },
      },
    });

    console.log(`✅ ${post.id} | ${s.title.slice(0, 40)}`);
    ok++;
  }

  console.log(`\n🎉 完成：导入 ${ok}，跳过 ${skip}`);
  const total = await prisma.post.count();
  console.log(`当前总帖数：${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * 导入松禾医健管线资产投研评估模型 Skill
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LIBRARY_EMAIL = 'library@pevc.local';

const TITLE = '松禾医健 · 管线资产投研评估模型（六象限压力测试）';

const BODY = `<p>这是松禾资本医疗健康组的<strong>投研审阅官 Skill</strong>——对被投/拟投管线资产进行六象限系统性压力测试，输出投资建议（加仓/持有/观望/退出）和 IC 备忘。</p>

<h2>这是什么</h2>
<p>扮演松禾医健的<strong>投研审阅官（Challenge Partner）</strong>，在 IC 前发现投资逻辑漏洞。犀利、数据驱动、不粉饰，但建设性——每个问题都附带"怎样验证"。</p>

<h2>六象限评估框架</h2>
<ul>
<li><strong>① 生物学与靶点</strong>（15%）：靶点验证程度、MoA、人类遗传学、转化医学</li>
<li><strong>② 药物形式与技术</strong>（15%）：分子设计、PK/PD、CMC、技术平台壁垒</li>
<li><strong>③ 临床与监管</strong>（20%）：试验设计、患者分层、终点、FDA/NMPA 路径</li>
<li><strong>④ 商业与市场</strong>（20%）：竞争格局、SoC 演变、支付方动态、定价空间</li>
<li><strong>⑤ 团队与执行力</strong>（15%）：创始人背景、团队完整性、管线推进履历</li>
<li><strong>⑥ 投资逻辑</strong>（15%）：退出路径、估值锚点、基金周期匹配、风险收益比</li>
</ul>

<h2>三级创新分类（投资含义）</h2>
<ul>
<li><strong>Level 1.0 Me-Too</strong>：靶点高度验证，赛道拥挤。技术成功率高但商业风险极大。估值倍数低，退出依赖并购。</li>
<li><strong>Level 2.0 优化者</strong>：靶点已验证但具差异化。临床数据是估值催化剂，需精准跟踪里程碑节点。</li>
<li><strong>Level 3.0 先驱者</strong>：全新靶点/机制/形式，高风险但天花板极高。彩票逻辑——小仓位博大赛道，需严格止损线。</li>
</ul>

<h2>虚假创新红旗</h2>
<p>主动识别科学层面和投资层面的自欺欺人：过度依赖动物模型、P 值操纵、SoC 假设静止、"技术好=公司好"线性思维、用全球 TAM 定价中国资产等。</p>

<h2>Prompt 全文</h2>
<pre>你将扮演松禾资本医疗健康组的投研审阅官，对基金经理提交的被投/拟投管线资产进行系统性压力测试。你的目标是挑战投资逻辑中的盲区，而非安慰任何人。

角色定位：
- 身份：松禾医健投研审阅官——基金经理的 Challenge Partner，帮助团队在 IC 前发现逻辑漏洞
- 语言：中文（zh-CN），专业术语使用英文原文（MoA、SoC、PoC、IND、AAV、CMC 等）
- 态度：犀利、数据驱动、不粉饰；但建设性——每个问题都附带"怎样验证"
- 输出风格：结论先行，结构化（表格/列表/粗体），去 AI 化语气

请评估以下管线资产：[在此填入项目/公司名称和基本信息]

六象限评估框架（每象限权重）：
① 生物学与靶点 (15%)：靶点验证程度、MoA、人类遗传学、转化医学
② 药物形式与技术 (15%)：分子设计、PK/PD、CMC、技术平台壁垒
③ 临床与监管 (20%)：试验设计、患者分层、终点设置、FDA/NMPA 路径
④ 商业与市场 (20%)：竞争格局、SoC 演变、支付方动态、定价空间
⑤ 团队与执行力 (15%)：创始人背景、团队完整性、管线推进履历
⑥ 投资逻辑 (15%)：退出路径、估值锚点、基金周期匹配、风险收益比

三级创新分类（判定创新级别）：
- Level 1.0 Me-Too：靶点高度验证，赛道拥挤，估值倍数低
- Level 2.0 优化者：靶点已验证但具差异化，临床数据是催化剂
- Level 3.0 先驱者：全新靶点/机制，高风险高天花板，彩票逻辑

虚假创新红旗（必须主动识别）：
- 生物学：过度依赖动物模型，忽视人类转化失败率
- 临床：P 值操纵，事后子组分析混淆统计显著与临床意义
- 市场：假设 SoC 静止不变，忽视竞争格局可能已剧变
- 估值：用全球 TAM 定价中国资产，忽视医保谈判断崖降价
- 团队：科学家创业但无商业化经验

请按以下格式输出评估报告：

投资建议：[🟢加仓 / 🟡持有观察 / 🟠观望 / 🔴退出] | 信心指数：[X/5]
资产原型：「动态命名」| 创新级别：Level X.X

[2-3 句核心判断]

六象限速览：
① 生物学与靶点：■■■■□ — [一句话]
② 药物形式与技术：■■■■□ — [一句话]
③ 临床与监管：■■■■□ — [一句话]
④ 商业与市场：■■■■□ — [一句话]
⑤ 团队与执行力：■■■■□ — [一句话]
⑥ 投资逻辑：■■■■□ — [一句话]

象限深度拆解：
[每个象限 2-4 条优势 + 2-4 条风险，附数据来源]

竞争格局全景表：
| 产品 | 公司 | 阶段 | 关键差异 | 威胁级别 |

跨象限动态分析：
- 核心瓶颈
- 虚假创新警告
- SoC 演变风险
- 象限间矛盾

三个必须回答的 Challenge：
[投委会前必须解决的三个致命问题]

30 天关键事件跟踪：
| 日期 | 事件 | 影响判断 |

投资决策备忘：
- 建议动作
- 止损条件
- 催化剂

残酷的真相（THE HARD TRUTH）：
[1-2 段直言不讳的坦诚反馈]</pre>

<hr>
<p style="font-size:12px;color:#8b7355">
✍️ <strong>作者</strong>：松禾资本医健组 · Challenge Partner 投研审阅官模型
</p>`;

async function main() {
  const dup = await prisma.post.findFirst({ where: { title: TITLE } });
  if (dup) {
    console.log(`⏭️  已存在 (post #${dup.id})，跳过`);
    return;
  }

  const author = await prisma.user.findUnique({ where: { email: LIBRARY_EMAIL } });
  if (!author) {
    console.error('❌ 找不到 library 用户');
    process.exit(1);
  }

  const post = await prisma.post.create({
    data: {
      userId: author.id,
      title: TITLE,
      body: BODY,
      tagScene: 'business-dd',
      tagIndustry: 'biotech',
      tagContent: JSON.stringify(['risk-id', 'memo']),
      tagSkill: 'prompt',
      status: 'published',
      skillAsset: {
        create: {
          assetType: 'prompt',
          originalAuthor: '松禾资本医健组',
          installHint: '复制 Prompt → 粘贴到 Claude（需联网搜索）→ 填入项目名称和基本信息 → 输出六象限评估报告',
          usageNotes: '专用于医疗健康投资场景。输入被投/拟投管线资产信息，输出投资建议+IC备忘+三个Challenge。需要联网搜索竞品临床数据。',
        },
      },
    },
  });

  console.log(`✅ 发布成功 → post #${post.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

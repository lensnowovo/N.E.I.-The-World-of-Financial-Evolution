import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始种子数据…');

  // 清空（仅开发用）
  await prisma.commentLike.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.postFavorite.deleteMany();
  await prisma.skillAsset.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: { email: 'vc@pevc.dev', nickname: '清流VC合伙人', role: 'VC', passwordHash: hash },
    }),
    prisma.user.create({
      data: { email: 'pe@pevc.dev', nickname: 'PE研究员小李', role: 'PE', passwordHash: hash },
    }),
    prisma.user.create({
      data: { email: 'fa@pevc.dev', nickname: 'FA-王经理', role: 'FA', passwordHash: hash },
    }),
    prisma.user.create({
      data: { email: 'vc2@pevc.dev', nickname: 'AI赛道分析师', role: 'VC', passwordHash: hash },
    }),
  ]);

  console.log('✅ 已创建 4 个用户（密码均为 password123）');

  const posts = await Promise.all([
    prisma.post.create({
      data: {
        userId: users[3].id,
        title: '一个 AI Agent 项目初筛 SOP：从 Demo 到投资判断的 6 步法',
        body: `<p>在过去半年里，我看了 70+ AI Agent 方向的项目，沉淀了一套快速筛选的 SOP。</p>
<h2>第一步：定义可投性</h2>
<p>不是所有 Agent 都值得投。我们关注的是<strong>能产生商业闭环</strong>且<strong>有数据飞轮</strong>的项目。</p>
<h2>第二步：技术尽调清单</h2>
<ul><li>底层模型策略：自研 / 微调 / API 调用</li><li>工程能力：上下文管理、工具调用、记忆机制</li><li>成本结构：单次 inference 成本曲线</li></ul>
<h2>第三步：市场定位</h2>
<p>横向看是否有 Wrapper 风险，纵向看 PMF 信号是否扎实。</p>
<blockquote>典型红旗：90% 收入来自 Top 3 客户、技术栈完全依赖单一供应商、护城河等于 prompt engineering。</blockquote>
<h2>第四步—第六步</h2>
<p>团队评估、估值锚定、决策框架的具体打分表见附件。</p>`,
        tagScene: 'screening',
        tagIndustry: 'ai-saas',
        tagContent: JSON.stringify(['risk-id', 'memo']),
        tagSkill: 'workflow',
        status: 'published',
        skillAsset: {
          create: { assetType: 'workflow' },
        },
      },
    }),
    prisma.post.create({
      data: {
        userId: users[1].id,
        title: 'DCF 估值模型常见 8 个坑（附 Excel 模板）',
        body: `<p>做了 50 多个项目的 DCF 之后，总结的常见错误。</p>
<h2>1. 终值占比过高</h2>
<p>当终值占总估值超过 75%，模型实际上变成了一个对永续增长率的猜测游戏。</p>
<h2>2. WACC 用了行业平均</h2>
<p>对于早期 / 高增长公司，行业平均 WACC 严重低估了风险。</p>
<h2>3. 未来 5 年都是高速增长</h2>
<p>S 曲线的衰减是必然规律，模型里应当体现。</p>
<p>剩余 5 个坑以及修正后的 Excel 模板见附件。</p>`,
        tagScene: 'financial',
        tagIndustry: null,
        tagContent: JSON.stringify(['data-clean']),
        tagSkill: 'template',
        status: 'published',
        skillAsset: {
          create: { assetType: 'template' },
        },
      },
    }),
    prisma.post.create({
      data: {
        userId: users[0].id,
        title: '我给一线 VC 同事写的「IC 立项报告」万能 Prompt',
        body: `<p>把投委会立项材料的撰写流程拆成了一个结构化 Prompt，可直接用于 Claude / ChatGPT。</p>
<h2>核心结构</h2>
<ul><li>项目一句话定位（不超过 30 字）</li><li>市场规模三段论：TAM / SAM / SOM</li><li>团队评估：履历 / 配合度 / 缺口</li><li>关键风险：3 个红旗与 mitigation</li><li>退出路径：IPO / M&A / 二级</li></ul>
<h2>完整 Prompt</h2>
<pre><code>你是一位资深 VC 投委会成员。请基于以下输入信息，按照「定位 → 市场 → 团队 → 风险 → 退出」结构生成一份不超过 1500 字的立项报告...</code></pre>
<p>测试结果：在 12 个真实项目上，输出可用率达 70%（即只需小幅修改即可送审）。</p>`,
        tagScene: 'ic',
        tagIndustry: 'ai-saas',
        tagContent: JSON.stringify(['memo', 'report-gen']),
        tagSkill: 'prompt',
        status: 'published',
        skillAsset: {
          create: { assetType: 'prompt' },
        },
      },
    }),
    prisma.post.create({
      data: {
        userId: users[2].id,
        title: '生物医药 BD 项目路演材料 Checklist（FA 视角）',
        body: `<p>作为生物医药方向的 FA，路演前我们会对 BP 做一轮 Checklist 复核。分享一份精简版。</p>
<h2>必备模块</h2>
<ol><li>科学故事：mechanism + clinical unmet need</li><li>管线进度：IND / Phase I/II/III 时间表</li><li>BD 比较表：Top 3 竞品的最近交易对价</li><li>团队科学顾问：CSO / SAB 阵容</li><li>资金计划：next milestone 所需金额与时间</li></ol>
<h2>常见缺失项</h2>
<p>80% 的早期 BP 缺少「Plan B」叙事——当主管线遇到 setback 时的备份策略。</p>`,
        tagScene: 'fundraising',
        tagIndustry: 'biotech',
        tagContent: JSON.stringify(['doc-parse']),
        tagSkill: 'template',
        status: 'published',
        skillAsset: {
          create: { assetType: 'template' },
        },
      },
    }),
    prisma.post.create({
      data: {
        userId: users[3].id,
        title: '用 Claude 自动化生成赛道扫描报告：3 小时变 20 分钟',
        body: `<p>过去一周我把行业扫描的标准流程接入了 Claude Skills。原来需要 3 小时的工作量现在 20 分钟搞定。</p>
<h2>工作流拆解</h2>
<ol><li>输入：赛道关键词 + 时间窗口</li><li>抓取：crunchbase / 36kr 公开数据</li><li>分类：按融资轮次、地域聚合</li><li>生成：结构化 Markdown 报告 + 关键洞察</li></ol>
<p>SKILL.md 详见附件。</p>`,
        tagScene: 'industry-research',
        tagIndustry: 'ai-saas',
        tagContent: JSON.stringify(['automation', 'report-gen', 'info-gather']),
        tagSkill: 'agent-skill',
        status: 'published',
        skillAsset: {
          create: { assetType: 'agent-skill' },
        },
      },
    }),
    prisma.post.create({
      data: {
        userId: users[0].id,
        title: '投后董事会日历模板：让被投公司 CEO 主动汇报',
        body: `<p>投后管理的痛点之一：被投 CEO 报喜不报忧、月报拖延。我们用一份「董事会日历模板」让节奏变成默认行为。</p>
<h2>核心机制</h2>
<ul><li>固定节奏：每月 25 日提交报表，次月 5 日董事会</li><li>结构化模板：财务 / 产品 / 团队 / 风险 4 大块</li><li>SLA 罚则：连续两次拖延则升级为月度紧急沟通</li></ul>
<p>实际效果：被投按时率从 40% 提升至 92%。</p>`,
        tagScene: 'post-investment',
        tagIndustry: null,
        tagContent: JSON.stringify(['memo']),
        tagSkill: 'template',
        status: 'published',
        skillAsset: {
          create: { assetType: 'template' },
        },
      },
    }),
  ]);

  console.log(`✅ 已创建 ${posts.length} 篇内容`);

  // 部分点赞 & 收藏 & 评论
  await prisma.postLike.createMany({
    data: [
      { userId: users[1].id, postId: posts[0].id },
      { userId: users[2].id, postId: posts[0].id },
      { userId: users[3].id, postId: posts[0].id },
      { userId: users[0].id, postId: posts[1].id },
      { userId: users[3].id, postId: posts[2].id },
      { userId: users[1].id, postId: posts[4].id },
    ],
  });
  await prisma.postFavorite.createMany({
    data: [
      { userId: users[0].id, postId: posts[1].id },
      { userId: users[2].id, postId: posts[2].id },
      { userId: users[1].id, postId: posts[4].id },
    ],
  });

  const c1 = await prisma.comment.create({
    data: {
      postId: posts[0].id,
      userId: users[1].id,
      body: '第三步「市场定位」展开讲讲？特别想看 Wrapper 风险的判断维度。',
    },
  });
  await prisma.comment.create({
    data: {
      postId: posts[0].id,
      userId: users[3].id,
      parentId: c1.id,
      body: '+1，最近看了几个项目都卡在这个问题上',
    },
  });
  await prisma.comment.create({
    data: {
      postId: posts[0].id,
      userId: users[0].id,
      parentId: c1.id,
      body: '@PE研究员小李 这部分细节我下篇单独写，建议关注。',
    },
  });
  await prisma.comment.create({
    data: {
      postId: posts[2].id,
      userId: users[1].id,
      body: '试了一下，配合 thinking 模式效果更好。',
    },
  });

  // 同步 commentCount
  for (const p of posts) {
    const cnt = await prisma.comment.count({ where: { postId: p.id } });
    await prisma.post.update({ where: { id: p.id }, data: { commentCount: cnt } });
  }

  console.log('✅ 已创建评论 / 点赞 / 收藏 演示数据');
  console.log('\n🎉 完成！可用测试账号：');
  console.log('  邮箱 vc@pevc.dev (VC) / pe@pevc.dev (PE) / fa@pevc.dev (FA) / vc2@pevc.dev (VC)');
  console.log('  密码：password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * 导入斯坦福 STORM 研究方法 Prompt（4 个链式提示词）
 * 来源：@heynavtoor Twitter 爆款帖（111K 曝光）
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LIBRARY_EMAIL = 'library@pevc.local';

const TITLE = '斯坦福 STORM 方法：让 AI 像博士一样做研究的 4 步提示词工作流';

const BODY = `<p>斯坦福大学开发的 STORM 方法，通过<strong>多视角提问</strong>，能创建出条理性提升 25% 的研究文章。这套工作流包含 4 个链式提示词，按顺序使用，5 分钟产出博士级研究简报。</p>

<h2>怎么用</h2>
<ol>
<li>把下方 4 个提示词<strong>按顺序</strong>依次粘贴到 Claude（或任意支持深度研究的 AI）</li>
<li>每个提示词的第一行把 <code>[你的主题]</code> 替换成你要研究的主题</li>
<li>等 AI 回复完一个再贴下一个——它们是链式的，后面的依赖前面的输出</li>
</ol>
<blockquote>适合：需要快速深入研究一个陌生领域的投资人、分析师、研究者。比横纵分析法更系统（5 个视角交叉 vs 2 个维度），但执行时间也更长（~5 分钟 vs 30 秒）。</blockquote>

<hr>
<p style="font-size:12px;color:#8b7355">
✍️ <strong>作者</strong>：Nav Toor（@heynavtoor）· 公开分享，可自由使用
</p>

<h2>提示词 1：多视角扫描</h2>
<pre>我需要研究 [你的主题]。

请模拟 5 个不同的专家视角：

1. 从业者：每天接触这个主题。
   他们知道哪些学者忽略的东西？
   哪些实际情况通常被忽视？

2. 学者：研究这个主题多年。
   同行评审的证据到底说了什么？
   证据在哪些地方与普遍看法相矛盾？

3. 怀疑者：认为主流观点是错误的。
   最有力的反对论点是什么？
   支持者方便地忽略了哪些证据？

4. 经济学家：追踪资金流向。
   谁从目前的叙事中获利？
   哪些财务激励塑造了相关研究？

5. 历史学家：见过类似模式。
   存在哪些历史类比？
   从这些类比的发展中可以学到什么？

针对每个视角，给出：
- 他们的核心立场（两句话）
- 支持他们观点的最强证据
- 只有这个视角会告诉我的那件事</pre>

<h2>提示词 2：矛盾地图</h2>
<pre>基于以上 5 个视角，绘制矛盾地图：

1. 哪两个或更多视角之间存在直接矛盾？
   列出每个冲突及相互矛盾的具体主张。
2. 哪个视角的证据最强？哪个最弱？为什么？
3. 如果能回答哪一个问题，就能解决最大的矛盾？
4. 所有视角都同意什么？
   （这很可能是真的，即使反对者也确认这一点。）
5. 没有一个视角涉及的话题是什么？
   （这是整个领域的盲点，通常也是最有价值的发现。）</pre>

<h2>提示词 3：综合总结</h2>
<pre>将 5 个视角和矛盾地图中的所有内容综合成一份研究简报：

1. 一段话总结：用向 CEO 汇报的方式解释这个主题，
   他只有 60 秒时间，需要的是细节而非标题。
2. 5 个关键发现：我现在知道的最重要的事情，按可靠性排序。
   注明每个发现得到哪些视角的支持、又受到哪些视角的质疑。
3. 隐藏关联：只有在同时审视所有 5 个视角时才会显现的非明显联系。
4. 可操作洞察：基于所有证据，从事 [你的角色] 的人
   实际上应该做出什么不同的行动？要具体。
5. 前沿问题：如果能回答哪一个问题，会彻底改变我们对这个主题的理解？</pre>

<h2>提示词 4：同行评审</h2>
<pre>现在对你自己的研究简报进行同行评审：

1. 可信度评分：对 5 个关键发现中的每一个按 1 到 10 分
   进行可靠性评分，并解释每个分数。
2. 最薄弱环节：你对哪个主张最不确定？
   需要哪些具体信息来验证它？
3. 偏见检查：在你的综合中，哪个视角可能被过度代表？
   是否有某个声音主导了分析？
4. 缺失视角：是否应该包括一个会改变结论的第 6 个角度？
5. 总体评分：如果斯坦福教授评审这份简报，
   他们会给什么分数？为什么？他们会让你修正什么？</pre>

<h2>使用建议</h2>
<ul>
<li><strong>提示词 1</strong> 产出 5 个截然不同的视角——从业者看到学者忽略的东西，怀疑者挑战从业者的假设</li>
<li><strong>提示词 2</strong> 找出冲突点——冲突之处才是真正理解所在。如果所有人都同意，那很可能是真的；如果没有人涉及某话题，你就发现了整个领域的空白</li>
<li><strong>提示词 3</strong> 综合成简报——没有任何单一专家能写出的报告，涵盖每个角度、指出矛盾、排序可靠性</li>
<li><strong>提示词 4</strong> 自我批评——这是博士生 48 小时才做的事，你 60 秒就完成了</li>
</ul>
<blockquote>STORM 有一个已知弱点：系统无法进行自我批评，来源偏见和事实错误会混入。提示词 4 通过让 AI 自我评分来解决这个问题。</blockquote>`;

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
      tagScene: 'industry-research',
      tagIndustry: null,
      tagContent: JSON.stringify(['info-gather', 'report-gen', 'debate']),
      tagSkill: 'prompt',
      status: 'published',
      skillAsset: {
        create: {
          assetType: 'prompt',
          originalAuthor: 'Nav Toor (@heynavtoor)',
          sourceUrl: 'https://youmind.com/landing/x-viral-articles/stanford-storm-claude-research-method',
          installHint: '4 个提示词按顺序粘贴到 Claude/ChatGPT，每个等回复完再贴下一个。',
          usageNotes: '适合需要深入研究一个主题的场景。比横纵分析法更系统（5 视角交叉），但更耗时（~5 分钟）。提示词 2 和 4 是区别于普通 AI 研究的关键——矛盾地图和同行评审。',
        },
      },
    },
  });

  console.log(`✅ 发布成功 → post #${post.id}`);
  console.log(`   标题：${TITLE}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

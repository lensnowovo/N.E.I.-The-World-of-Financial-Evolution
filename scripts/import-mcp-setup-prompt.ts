/**
 * 导入 MCP 配置 Prompt（用户复制给 AI 客户端自动配置）
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LIBRARY_EMAIL = 'library@pevc.local';

const TITLE = '一键配置 Prompt：让你的 AI 客户端连上 N.E.I. Skill 库';

const BODY = `<p>这个 Prompt 的作用：把它复制粘贴给你的 AI 客户端（Claude Code / Cursor / Windsurf 等），客户端会自动帮你配好 N.E.I. MCP Server，之后你就能在客户端里直接搜索和调用 N.E.I. 上所有的 Skill（Prompt / 模板 / 工作流等）。</p>

<h2>使用前提</h2>
<ol>
<li>你已经在 N.E.I. 网站（<a href="https://nei-pevc.com">nei-pevc.com</a>）注册了账号</li>
<li>你已经在连接配置页生成了 MCP Token（连接配置 → MCP Server → 生成 Token）</li>
<li>你收藏了几个你想用的 Skill</li>
</ol>

<h2>Prompt 全文</h2>
<pre>请帮我配置 N.E.I. MCP Server。

我需要你完成以下操作：
1. 找到本机的 MCP 配置文件位置（Claude Code 是 ~/.claude/mcp_settings.json 或项目根目录 .mcp.json；Cursor 是 Settings → MCP；其他客户端请查找对应的 MCP 配置方式）
2. 添加一个名为 "nei" 的 MCP Server，配置如下：
   - 传输方式：Streamable HTTP
   - URL：https://nei-pevc.com/api/mcp
   - 请求头：Authorization: Bearer [在这里粘贴你的 MCP Token，格式是 nei_xxxxxx]

配置完成后，请调用 nei 的 list_my_skills 工具，告诉我看到了哪些 Skill。如果返回"还没有收藏"，提醒我去网站收藏一些 Skill。

如果调用成功，说明配置完成，我以后就可以在对话里直接说"用 N.E.I. 上的 skill 帮我做 [某事]"，你就会自动搜索并使用对应的 Prompt。</pre>

<h2>怎么用</h2>
<ol>
<li>先去 N.E.I. 设置页生成 MCP Token，复制保存</li>
<li>复制上面的 Prompt，把 <code>[在这里粘贴你的 MCP Token]</code> 替换成你的实际 Token；只粘贴到你信任的本地或已登录客户端</li>
<li>把整段 Prompt 粘贴到你的 AI 客户端对话框</li>
<li>等 AI 完成配置并返回你收藏的 Skill 列表</li>
<li>完成！以后在客户端里说需求，AI 就会自动用 N.E.I. 上的 Skill</li>
</ol>

<blockquote>这个 Prompt 在 Claude Code / Cursor / Windsurf 等支持 MCP 的客户端上都能用。不同客户端的配置文件位置可能不同，AI 会自动识别。</blockquote>`;

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
      tagScene: 'crm',
      tagIndustry: null,
      tagContent: JSON.stringify(['automation']),
      tagSkill: 'prompt',
      status: 'published',
      skillAsset: {
        create: {
          assetType: 'prompt',
          originalAuthor: 'N.E.I. 社区',
          sourceUrl: 'https://nei-pevc.com/mcp',
          installHint: '复制 Prompt → 替换 Token → 粘贴到 AI 客户端 → AI 自动完成 MCP 配置',
          usageNotes: '一键配置 N.E.I. MCP Server。前提：已在 N.E.I. 注册并生成 MCP Token，已收藏想用的 Skill。',
        },
      },
    },
  });

  console.log(`✅ 发布成功 → post #${post.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

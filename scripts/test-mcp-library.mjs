/**
 * 测试 lib/mcp-library.ts 的纯函数
 *
 * 运行方式（项目根目录）:
 *   npx tsx scripts/test-mcp-library.mjs
 *
 * 或者直接用 node（需要 tsx）:
 *   node --import tsx scripts/test-mcp-library.mjs
 *
 * 验证内容:
 * 1. listConnectors — 浏览/过滤
 * 2. getConnectorDetail — 查单个
 * 3. searchConnectors — 按关键词搜
 * 4. recommendConnectorsForTask — 按任务推荐（关键词命中）
 * 5. buildConnectorSetupPrompt — 加载 prompt 拼接
 */

import {
  listConnectors,
  getConnectorDetail,
  searchConnectors,
  recommendConnectorsForTask,
  buildConnectorSetupPrompt,
  getConnectorById,
} from '../lib/mcp-library.ts';

let passed = 0;
let failed = 0;

function assert(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

console.log('\n=== N.E.I. MCP Library 纯函数测试 ===\n');

// ── 1. listConnectors ──────────────────────────────────────────────
console.log('1. listConnectors');
{
  const all = listConnectors();
  assert('返回全部连接器（含 nei-pevc，应 ≥16）', all.length >= 16, `实际 ${all.length}`);

  const biomed = listConnectors({ category: 'biomed' });
  assert('按分类过滤 biomed', biomed.length >= 1 && biomed.every((c) => c.category === 'biomed'));

  const mcpOnly = listConnectors({ kind: 'MCP' });
  assert('按 kind=MCP 过滤', mcpOnly.length >= 1 && mcpOnly.every((c) => c.kind === 'MCP'));

  const externalOnly = listConnectors({ internalOnly: false });
  assert('只返回外部（不含 nei-pevc）', externalOnly.every((c) => c.internal === false));

  const internalOnly = listConnectors({ internalOnly: true });
  assert('只返回 internal（nei-pevc）', internalOnly.length === 1 && internalOnly[0].id === 'nei-pevc');

  const limited = listConnectors({ limit: 3 });
  assert('limit 生效', limited.length === 3);
}

// ── 2. getConnectorDetail ──────────────────────────────────────────
console.log('\n2. getConnectorDetail');
{
  const biomcp = getConnectorDetail('biomcp');
  assert('查 biomcp 存在', biomcp !== null && biomcp.name === 'BioMCP');
  assert('含 coverage 字段', biomcp !== null && biomcp.coverage.length > 0);
  assert('含 safetyNote 字段', biomcp !== null && biomcp.safetyNote.length > 0);

  const nei = getConnectorDetail('nei-pevc');
  assert('查 nei-pevc 存在', nei !== null && nei.internal === true);

  const notFound = getConnectorDetail('nonexistent');
  assert('查不存在的 id 返回 null', notFound === null);
}

// ── 3. searchConnectors ────────────────────────────────────────────
console.log('\n3. searchConnectors');
{
  const clinical = searchConnectors('clinical trials');
  assert('搜 clinical trials 命中 BioMCP', clinical.some((c) => c.id === 'biomcp'));

  const sec = searchConnectors('SEC 10-K');
  assert('搜 SEC 10-K 命中 SEC EDGAR', sec.some((c) => c.id === 'sec-edgar'));

  const github = searchConnectors('github 开源');
  assert('搜 github 开源 命中 GitHub MCP', github.some((c) => c.id === 'github-mcp'));

  const empty = searchConnectors('zzz_no_match_zzz');
  assert('搜不到返回空数组', empty.length === 0);
}

// ── 4. recommendConnectorsForTask ──────────────────────────────────
console.log('\n4. recommendConnectorsForTask');
{
  const bioTask = recommendConnectorsForTask('创新药靶点文献梳理和临床试验进度查询', 'biotech');
  assert('创新药任务推荐 BioMCP', bioTask.some((c) => c.id === 'biomcp'));
  assert('推荐结果含 reason 字段', bioTask.length > 0 && bioTask[0].reason.length > 0);
  assert('推荐结果含 confirmHint 字段', bioTask.length > 0 && bioTask[0].confirmHint.length > 0);

  const aiTask = recommendConnectorsForTask('AI 开源模型生态评估和大模型热度分析', 'ai-saas');
  assert('AI 任务推荐 HuggingFace', aiTask.some((c) => c.id === 'huggingface-mcp'));

  const hardTechTask = recommendConnectorsForTask('核聚变 LCOE 验算和 Lawson 判据', 'hard-tech');
  assert('硬科技任务推荐 Wolfram', hardTechTask.some((c) => c.id === 'wolfram-alpha'));

  const secTask = recommendConnectorsForTask('拆 S-1 商业模式和 10-K 风险披露');
  assert('SEC 任务推荐 SEC EDGAR', secTask.some((c) => c.id === 'sec-edgar'));

  const maxThree = recommendConnectorsForTask('创新药 AI 开源模型 核聚变 SEC 论文');
  assert('最多返回 3 条', maxThree.length <= 3);

  const internalNotRec = recommendConnectorsForTask('PEVC Skill 投研');
  assert('nei-pevc（internal）不参与推荐', !internalNotRec.some((c) => c.id === 'nei-pevc'));

  const watchlisted = recommendConnectorsForTask('Financial Datasets 估值');
  assert('观察中的 connector 只有显式提到名字才推荐', watchlisted.some((c) => c.id === 'financial-datasets'));

  const watchlistedNotMentioned = recommendConnectorsForTask('可比公司估值分析');
  assert('观察中 connector 未提到名字则不推荐', !watchlistedNotMentioned.some((c) => c.id === 'financial-datasets'));
}

// ── 5. buildConnectorSetupPrompt ───────────────────────────────────
console.log('\n5. buildConnectorSetupPrompt');
{
  const biomcp = getConnectorById('biomcp');
  const prompt = buildConnectorSetupPrompt(biomcp);
  assert('prompt 含名称', prompt.includes('BioMCP'));
  assert('prompt 含项目地址', prompt.includes('github.com/genomoncology/biomcp'));
  assert('prompt 含鉴权信息', prompt.includes('无需密钥'));
  assert('prompt 含安全前提', prompt.includes('安全前提'));
  assert('prompt 含接入步骤', prompt.includes('接入步骤'));

  const internalPrompt = buildConnectorSetupPrompt(getConnectorById('nei-pevc'));
  assert('internal prompt 含 /connect 引导', internalPrompt.includes('/connect'));

  const apiPrompt = buildConnectorSetupPrompt(getConnectorById('sec-edgar'));
  assert('API 类 prompt 提示先包一层 MCP', apiPrompt.includes('包一层本地 MCP'));

  const watchlistedPrompt = buildConnectorSetupPrompt(getConnectorById('microchip-mcp'));
  assert('观察中 prompt 提示先调研', watchlistedPrompt.includes('确认安装方式'));
}

// ── 汇总 ───────────────────────────────────────────────────────────
console.log('\n=== 测试汇总 ===');
console.log(`通过: ${passed}  失败: ${failed}  总计: ${passed + failed}`);
if (failed > 0) {
  console.log('\n❌ 有失败项');
  process.exit(1);
} else {
  console.log('\n✅ 全部通过');
  process.exit(0);
}

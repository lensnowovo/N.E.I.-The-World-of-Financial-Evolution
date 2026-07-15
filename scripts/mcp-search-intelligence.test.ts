import assert from 'node:assert/strict';
import test from 'node:test';
import {
  interpretMcpTask,
  rankMcpCandidates,
  recommendationReason,
  recommendationRole,
  resolveMcpScenes,
  type McpSearchCandidate,
} from '../lib/mcp-search-intelligence';

const intentCases: Array<[string, string, string?]> = [
  ['帮我看看这个 BP', 'screening'],
  ['拆一下BP，判断值不值得继续看', 'screening'],
  ['这个项目要不要深看', 'screening'],
  ['做一份行业研究', 'industry-research'],
  ['快速了解一个陌生行业', 'industry-research'],
  ['看看这个赛道的竞争格局', 'industry-research'],
  ['测算 TAM SAM SOM', 'industry-research'],
  ['帮我测算市场空间', 'industry-research'],
  ['准备访谈创始人', 'business-dd'],
  ['生成客户访谈提纲', 'business-dd'],
  ['准备专家访谈', 'business-dd'],
  ['对这个项目做商业尽调', 'business-dd'],
  ['分析三表和现金流', 'financial'],
  ['测算 IRR 和 MOIC', 'financial'],
  ['分析退出回报', 'financial'],
  ['准备上会材料', 'ic'],
  ['写一份 IC Memo', 'ic'],
  ['形成投资备忘录', 'ic'],
  ['跟踪被投企业经营情况', 'post-investment'],
  ['投后月报没达标，看看问题', 'post-investment'],
  ['准备 LP 季报', 'fundraising'],
  ['整理募资材料', 'fundraising'],
  ['整理基金运营台账', 'fund-ops'],
  ['把会议纪要沉淀进团队知识库', 'crm'],
  ['帮我找项目', 'sourcing'],
  ['检查投资协议和 VIE 风险', 'legal'],
  ['做细胞与基因治疗产业研究', 'industry-research', 'biotech'],
  ['快速了解 CGT 赛道', 'industry-research', 'biotech'],
  ['准备访谈一家细胞治疗公司的创始人', 'business-dd', 'biotech'],
  ['对一家基因治疗项目进行初筛', 'screening', 'biotech'],
  ['梳理半导体竞争格局', 'industry-research', 'semiconductor'],
  ['研究新能源储能市场空间', 'industry-research', 'climate'],
  ['分析企业软件行业', 'industry-research', 'ai-saas'],
  ['研究商业航天赛道', 'industry-research', 'aerospace'],
];

for (const [query, scene, industry] of intentCases) {
  test(`interprets task: ${query}`, () => {
    const result = interpretMcpTask(query);
    assert.ok(result.inferredScenes.includes(scene), `${query} should infer ${scene}`);
    if (industry) assert.ok(result.inferredIndustries.includes(industry), `${query} should infer ${industry}`);
    assert.notEqual(result.interpretedIntent, '通用 Skill 检索');
  });
}

test('empty and unknown tasks degrade without inventing an intent', () => {
  assert.deepEqual(interpretMcpTask('').inferredScenes, []);
  const unknown = interpretMcpTask('请处理一下这件事情');
  assert.deepEqual(unknown.inferredScenes, []);
  assert.equal(unknown.interpretedIntent, '通用 Skill 检索');
});

test('unknown relevance queries do not return popular but unrelated candidates', () => {
  const popular = candidate({
    id: 99,
    title: '热门行业框架',
    viewCount: 1_000_000,
    _count: { stars: 100_000, comments: 1_000, attachments: 0 },
  });
  assert.deepEqual(rankMcpCandidates([popular], { text: '完全不存在的专有词' }), []);
});

test('an explicit scene takes precedence over inferred scene and stage', () => {
  assert.deepEqual(
    resolveMcpScenes({ scene: 'financial', text: '做行业研究', stage: 'pre-deal' }),
    ['financial'],
  );
});

test('stage narrows compatible inferred scenes and does not replace the task', () => {
  assert.deepEqual(resolveMcpScenes({ text: '准备上会', stage: 'deal' }), ['ic']);
  assert.deepEqual(resolveMcpScenes({ text: '准备上会', stage: 'pre-deal' }), ['ic']);
});

function candidate(overrides: Partial<McpSearchCandidate> & Pick<McpSearchCandidate, 'id' | 'title'>): McpSearchCandidate {
  return {
    body: '',
    tagScene: null,
    tagIndustry: null,
    tagSkill: 'agent-skill',
    tagContent: '[]',
    featured: false,
    viewCount: 0,
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    skillAsset: { assetType: 'agent-skill' },
    _count: { stars: 0, comments: 0, attachments: 0 },
    ...overrides,
  };
}

test('relevance dominates popularity', () => {
  const relevant = candidate({ id: 1, title: '项目初筛框架', tagScene: 'screening' });
  const popular = candidate({
    id: 2,
    title: 'LP 年度汇报模板',
    tagScene: 'fundraising',
    viewCount: 1_000_000,
    _count: { stars: 100_000, comments: 10_000, attachments: 0 },
    featured: true,
  });
  const ranked = rankMcpCandidates([popular, relevant], { text: '帮我看看这个 BP' });
  assert.equal(ranked[0].post.id, relevant.id);
});

test('exact title phrase is the strongest text signal', () => {
  const exact = candidate({ id: 1, title: '专家访谈提纲', tagScene: 'business-dd' });
  const generic = candidate({ id: 2, title: '商业尽调工作流', tagScene: 'business-dd', featured: true });
  const ranked = rankMcpCandidates([generic, exact], { text: '专家访谈提纲' });
  assert.equal(ranked[0].post.id, exact.id);
  assert.ok(ranked[0].matchedSignals.includes('标题完全匹配'));
});

test('CGT research ranks a sector framework before unrelated popular content', () => {
  const sector = candidate({
    id: 10,
    title: '细胞与基因治疗投资研究框架',
    tagScene: 'industry-research',
    tagIndustry: 'biotech',
    tagContent: '["info-gather","competitive-map"]',
  });
  const generic = candidate({ id: 11, title: '行业研究端到端工作流', tagScene: 'industry-research' });
  const irrelevant = candidate({
    id: 12,
    title: 'Anthropic 项目初筛',
    tagScene: 'screening',
    viewCount: 999_999,
    _count: { stars: 99_999, comments: 0, attachments: 0 },
  });
  const ranked = rankMcpCandidates([irrelevant, generic, sector], {
    text: '做细胞与基因产业研究，覆盖产业链、市场空间和竞争格局',
  });
  assert.equal(ranked[0].post.id, sector.id);
  assert.ok(ranked[0].matchedSignals.includes('行业：biotech'));
});

test('CGT founder interview remains diligence rather than industry research', () => {
  const interview = candidate({
    id: 20,
    title: '创始人访谈提纲',
    tagScene: 'business-dd',
    tagIndustry: 'biotech',
    tagContent: '["expert-call"]',
  });
  const research = candidate({
    id: 21,
    title: '细胞治疗行业概览',
    tagScene: 'industry-research',
    tagIndustry: 'biotech',
  });
  const ranked = rankMcpCandidates([research, interview], { text: '准备访谈一家细胞治疗公司的创始人' });
  assert.equal(ranked[0].post.id, interview.id);
});

test('ranking is deterministic when scores tie', () => {
  const older = candidate({ id: 30, title: '通用框架', tagScene: 'industry-research', updatedAt: '2026-01-01' });
  const newer = candidate({ id: 31, title: '通用框架', tagScene: 'industry-research', updatedAt: '2026-02-01' });
  const first = rankMcpCandidates([older, newer], { text: '行业研究' }).map((entry) => entry.post.id);
  const second = rankMcpCandidates([newer, older], { text: '行业研究' }).map((entry) => entry.post.id);
  assert.deepEqual(first, [31, 30]);
  assert.deepEqual(second, [31, 30]);
});

test('recommendation roles and reasons are concise and grounded in matched signals', () => {
  assert.equal(recommendationRole(0, 6), 'primary');
  assert.equal(recommendationRole(1, 6), 'supporting');
  assert.equal(recommendationRole(4, 6), 'optional');
  const ranked = rankMcpCandidates(
    [candidate({ id: 40, title: '市场空间测算', tagScene: 'industry-research' })],
    { text: '市场空间测算' },
  );
  assert.match(recommendationReason(ranked[0]), /^匹配/);
});

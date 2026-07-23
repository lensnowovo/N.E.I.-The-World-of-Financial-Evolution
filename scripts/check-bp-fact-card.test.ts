import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const skillPath = path.join(process.cwd(), 'public', 'file-cache', 'nei-bp-fact-card.md');
const skill = fs.readFileSync(skillPath, 'utf8');

test('BP fact card has valid Skill frontmatter and a focused trigger description', () => {
  assert.match(skill, /^---\nname: bp-fact-card\n/);
  assert.match(skill, /description:.*BP.*项目事实卡/);
});

test('BP fact card separates evidence states and requires traceable sources', () => {
  for (const status of ['材料披露', '计算结果', '合理推断', '外部已验证', '未披露', '存在冲突']) {
    assert.ok(skill.includes(status), `missing evidence state: ${status}`);
  }
  assert.match(skill, /标注页码/);
  assert.match(skill, /不要编造页码/);
});

test('BP fact card covers the general-purpose company fact model', () => {
  for (const section of [
    '公司、产品与客户',
    '行业与产业链位置',
    '商业模式与经营进展',
    '关键数据表',
    '团队、股权与融资',
    '关键主张—证据表',
    '冲突、缺口与待验证事项',
    '下一轮问题',
  ]) {
    assert.ok(skill.includes(section), `missing section: ${section}`);
  }
});

test('BP fact card keeps fund fit and investment recommendations out of scope', () => {
  assert.match(skill, /不负责判断项目是否符合某家基金/);
  assert.match(skill, /不构成投资建议/);
  assert.match(skill, /结合机构策略、基金约束/);
});

test('BP fact card includes privacy and anti-hallucination safeguards', () => {
  assert.match(skill, /先提醒用户脱敏/);
  assert.match(skill, /不强行凑亮点、红旗或数字/);
  assert.match(skill, /不确认 TAM、增速和渗透率真实/);
});


import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('app/api/mcp/route.ts', 'utf8');

test('MCP responses do not expose ranking scores or database identifiers', () => {
  assert.doesNotMatch(source, /\brelevanceScore\s*:/);
  assert.doesNotMatch(source, /Post ID:/);
  assert.doesNotMatch(source, /Skill ID/);

  const mapperStart = source.indexOf('function postToMcpItem');
  const mapperEnd = source.indexOf('async function findMcpSkillIdByTitle');
  assert.ok(mapperStart >= 0 && mapperEnd > mapperStart);
  const publicItemMapper = source.slice(mapperStart, mapperEnd);
  assert.doesNotMatch(publicItemMapper, /\bid\s*:\s*post\.id/);
  assert.doesNotMatch(publicItemMapper, /\b(viewCount|stars|comments|attachments)\s*:/);
});

test('downstream Skill tools use the exact public title', () => {
  for (const toolName of ['get_skill', 'apply_skill', 'favorite_skill', 'unfavorite_skill']) {
    const toolStart = source.indexOf(`'${toolName}'`);
    assert.ok(toolStart >= 0, `${toolName} is registered`);
    const toolSource = source.slice(toolStart, toolStart + 1_200);
    assert.match(toolSource, /title:\s*z\.string\(\)/, `${toolName} accepts a title`);
  }
});

test('server instructions keep internal diagnostics away from users', () => {
  assert.match(
    source,
    /Do not expose internal ranking signals or database identifiers to the user\./,
  );
});

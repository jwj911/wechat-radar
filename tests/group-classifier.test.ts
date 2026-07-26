import { describe, it, expect } from 'vitest';
import { classifyGroupHeuristic, effectiveGroupIds } from '../lib/group-classifier';
import type { GroupRow } from '../lib/groups';

function makeGroup(id: number, name: string): GroupRow {
  return {
    id,
    name,
    color: '#000000',
    emoji: null,
    sort_order: id,
    created_at: 0,
  };
}

// Names chosen so the classifier's `lookup(target)` substring matches resolve.
const GROUPS: GroupRow[] = [
  makeGroup(1, 'AI产品蝗虫团'), // matches lookup('蝗虫')
  makeGroup(2, '自营/读者群'), // matches lookup('自营/读者群')
  makeGroup(3, 'WaytoAGI'), // matches lookup('WaytoAGI')
  makeGroup(4, 'Vibe Coding · 编程'), // matches lookup('Vibe Coding')
  makeGroup(5, 'AI 圈社交'), // matches lookup('AI 圈社交')
];

describe('classifyGroupHeuristic', () => {
  it('classifies 蝗虫团 names into the 蝗虫 group', () => {
    expect(classifyGroupHeuristic('蝗虫团xxx', '', GROUPS)).toEqual({
      group_id: 1,
      group_name: 'AI产品蝗虫团',
      reason: '蝗虫团系列',
    });
  });

  it('classifies 通往AGI names into the WaytoAGI group', () => {
    expect(classifyGroupHeuristic('通往AGI 学习交流', '', GROUPS)).toEqual({
      group_id: 3,
      group_name: 'WaytoAGI',
      reason: 'WaytoAGI 系列',
    });
  });

  it('classifies vibe coding / mcp text into the Vibe Coding group', () => {
    expect(classifyGroupHeuristic('Tech Chat', 'we discuss vibe coding here', GROUPS)).toEqual({
      group_id: 4,
      group_name: 'Vibe Coding · 编程',
      reason: '编程 / Skills / CLI',
    });
    // `mcp` keyword also routes to Vibe Coding
    expect(classifyGroupHeuristic('random', 'using mcp servers', GROUPS)).toEqual({
      group_id: 4,
      group_name: 'Vibe Coding · 编程',
      reason: '编程 / Skills / CLI',
    });
  });

  it('falls back to the generic AI (兜底) bucket', () => {
    expect(classifyGroupHeuristic('gpt 讨论组', '', GROUPS)).toEqual({
      group_id: 5,
      group_name: 'AI 圈社交',
      reason: '通用 AI（兜底）',
    });
  });

  it('returns null when a matching regex has no corresponding group in the array', () => {
    // Regex `/蝗虫团/` matches, but there is no group whose name includes '蝗虫'.
    expect(classifyGroupHeuristic('蝗虫团xxx', '', [])).toBeNull();
    // A groups array without any lookup target still yields null.
    const unrelated = [makeGroup(10, '完全无关的群')];
    expect(classifyGroupHeuristic('蝗虫团xxx', '', unrelated)).toBeNull();
  });

  it('returns null when no regex branch matches at all', () => {
    expect(classifyGroupHeuristic('zzz', 'qqq', GROUPS)).toBeNull();
  });
});

describe('effectiveGroupIds', () => {
  it('returns explicit ids unchanged and ignores classification', () => {
    // Even though the name would classify to group 1, explicit ids win.
    expect(effectiveGroupIds('蝗虫团xxx', '', [99, 42], GROUPS)).toEqual([99, 42]);
  });

  it('returns the guessed group id when there are no explicit ids', () => {
    expect(effectiveGroupIds('蝗虫团xxx', '', [], GROUPS)).toEqual([1]);
  });

  it('returns an empty array when there are no explicit ids and no guess', () => {
    expect(effectiveGroupIds('zzz', 'qqq', [], GROUPS)).toEqual([]);
  });
});

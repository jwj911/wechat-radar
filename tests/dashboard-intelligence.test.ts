import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryDb } from './helpers/memory-db';

// Fresh per-test DB, read lazily by the hoisted mock via `() => memDb`.
let memDb: ReturnType<typeof createMemoryDb>;

vi.mock('../lib/db', () => ({ db: () => memDb }));

// dashboard-intelligence.ts imports only `cache` from ../lib/cache. The real
// cache is a module-level NodeCache singleton keyed by date; because every test
// in this file uses the same process, a real cache would bleed results across
// tests. Mock it to a no-op so each call recomputes deterministically.
vi.mock('../lib/cache', () => ({
  cache: { get: () => undefined, set: () => undefined, del: () => undefined },
  CK: {},
}));

import { buildDashboardIntelligence } from '../lib/dashboard-intelligence';

const DATE = '2024-03-10';

interface SeedMessage {
  chatroom_id: string;
  local_id: number;
  sender: string;
  content: string;
  date?: string;
}

function seedMessages(rows: SeedMessage[]) {
  const stmt = memDb.prepare(
    `INSERT INTO messages
       (chatroom_id, local_id, sender, content, time, timestamp, type, date)
     VALUES (?, ?, ?, ?, ?, ?, 'text', ?)`,
  );
  let ts = 1_710_000_000;
  for (const r of rows) {
    const date = r.date ?? DATE;
    const time = `${date} 10:${String(rows.indexOf(r)).padStart(2, '0')}:00`;
    stmt.run(r.chatroom_id, r.local_id, r.sender, r.content, time, ts++, date);
  }
}

function seedLink(opts: {
  chatroom_id: string;
  local_id: number;
  canonical_url: string;
  url: string;
  domain: string;
  title: string;
  source?: string;
}) {
  memDb
    .prepare(
      `INSERT INTO message_links
         (chatroom_id, local_id, date, sender, time, timestamp, url, canonical_url,
          title, description, domain, source, raw_kind, confidence, created_at)
       VALUES (?, ?, ?, 'someone', ?, ?, ?, ?, ?, NULL, ?, ?, 'plain_url', 1, ?)`,
    )
    .run(
      opts.chatroom_id,
      opts.local_id,
      DATE,
      `${DATE} 10:30:00`,
      1_710_050_000,
      opts.url,
      opts.canonical_url,
      opts.title,
      opts.domain,
      opts.source ?? 'plain_url',
      Date.now(),
    );
}

// A realistic mix. Contents are all >= 8 chars so they pass the main query's
// `length(content) >= 8` filter. Two Alice signals ensure signal_sources /
// people_radar (which require signal_count >= 2) are populated.
const SEED: SeedMessage[] = [
  {
    chatroom_id: 'roomA',
    local_id: 1,
    sender: 'Alice',
    content: '有没有好用的AI Agent工具推荐？想找一个能自动化对接的方案',
  },
  {
    chatroom_id: 'roomA',
    local_id: 2,
    sender: 'Alice',
    content: '分享一个开源GitHub项目 链接 https://github.com/foo/bar 大家帮忙看看评估一下',
  },
  {
    chatroom_id: 'roomA',
    local_id: 3,
    sender: 'Bob',
    content:
      '深入聊聊Claude Code的CLI工作流，这里有一段很长的观点内容，需要凑够八十个字符以上来触发长观点加分逻辑，所以继续写写写写写写写写写写写写',
  },
  {
    chatroom_id: 'roomA',
    local_id: 4,
    sender: 'Carol',
    content: '系统提示：撤回了一条消息',
  },
  {
    chatroom_id: 'roomA',
    local_id: 5,
    sender: 'Dave',
    content: '今天天气真不错大家吃了吗',
  },
  {
    chatroom_id: 'roomB',
    local_id: 1,
    sender: 'Eve',
    content: '团购飞书录音豆名额有限，报名从速，采购对接请私信',
  },
  {
    chatroom_id: 'roomB',
    local_id: 2,
    sender: 'Frank',
    content: '这篇文章值得一读 https://mp.weixin.qq.com/s/abcDEF 深度复盘教程',
  },
];

const GROUP_NAMES = new Map<string, string>([
  ['roomA', 'AI工具群'],
  ['roomB', '商务合作群'],
]);

beforeEach(() => {
  memDb = createMemoryDb();
});

const TOP_LEVEL_KEYS = [
  'date',
  'must_read',
  'opportunities',
  'signal_sources',
  'action_items',
  'topic_lifecycle',
  'link_highlights',
  'people_radar',
  'content_ideas',
  'anomalies',
] as const;

describe('buildDashboardIntelligence', () => {
  it('returns the full DashboardIntelligence shape without throwing', () => {
    seedMessages(SEED);
    seedLink({
      chatroom_id: 'roomA',
      local_id: 2,
      canonical_url: 'https://github.com/foo/bar',
      url: 'https://github.com/foo/bar',
      domain: 'github.com',
      title: 'Foo Bar 开源仓库',
    });
    seedLink({
      chatroom_id: 'roomB',
      local_id: 2,
      canonical_url: 'https://mp.weixin.qq.com/s/abcDEF',
      url: 'https://mp.weixin.qq.com/s/abcDEF',
      domain: 'mp.weixin.qq.com',
      title: '深度复盘文章',
    });

    const result = buildDashboardIntelligence(DATE, GROUP_NAMES);

    expect(result).toBeDefined();
    expect(Object.keys(result).sort()).toEqual([...TOP_LEVEL_KEYS].sort());
    expect(result.date).toBe(DATE);

    // Every collection field is an array.
    for (const key of TOP_LEVEL_KEYS) {
      if (key === 'date') continue;
      expect(Array.isArray(result[key as keyof typeof result])).toBe(true);
    }
  });

  it('extracts high-signal messages into must_read with the expected item shape', () => {
    seedMessages(SEED);

    const result = buildDashboardIntelligence(DATE, GROUP_NAMES);

    expect(result.must_read.length).toBeGreaterThan(0);
    const item = result.must_read[0];
    expect(item).toMatchObject({
      chatroom_id: expect.any(String),
      chat_name: expect.any(String),
      local_id: expect.any(Number),
      sender: expect.any(String),
      time: expect.any(String),
      title: expect.any(String),
      snippet: expect.any(String),
      score: expect.any(Number),
      reasons: expect.any(Array),
    });
    // chat_name is resolved from the provided groupNames map.
    expect([...GROUP_NAMES.values()]).toContain(item.chat_name);
    // The noise message ("撤回了一条消息") must never surface as a signal.
    expect(result.must_read.every((m) => !m.snippet.includes('撤回了一条消息'))).toBe(true);
  });

  it('detects opportunities and people/source signals for repeat senders', () => {
    seedMessages(SEED);

    const result = buildDashboardIntelligence(DATE, GROUP_NAMES);

    // "有没有...工具推荐" and "团购...报名...采购对接" are opportunities.
    expect(result.opportunities.length).toBeGreaterThan(0);
    expect(result.opportunities[0]).toHaveProperty('action');

    // Alice authored 2 high-signal messages -> she clears the signal_count>=2 gate.
    const senders = result.signal_sources.map((s) => s.sender);
    expect(senders).toContain('Alice');
    const alice = result.signal_sources.find((s) => s.sender === 'Alice')!;
    expect(alice.signal_count).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(alice.strengths)).toBe(true);

    const radarNames = result.people_radar.map((p) => p.sender);
    expect(radarNames).toContain('Alice');
  });

  it('builds link highlights (article + tool) from message_links joined to messages', () => {
    seedMessages(SEED);
    seedLink({
      chatroom_id: 'roomA',
      local_id: 2,
      canonical_url: 'https://github.com/foo/bar',
      url: 'https://github.com/foo/bar',
      domain: 'github.com',
      title: 'Foo Bar 开源仓库',
    });
    seedLink({
      chatroom_id: 'roomB',
      local_id: 2,
      canonical_url: 'https://mp.weixin.qq.com/s/abcDEF',
      url: 'https://mp.weixin.qq.com/s/abcDEF',
      domain: 'mp.weixin.qq.com',
      title: '深度复盘文章',
    });

    const result = buildDashboardIntelligence(DATE, GROUP_NAMES);

    expect(result.link_highlights.length).toBe(2);
    const kinds = result.link_highlights.map((l) => l.kind).sort();
    expect(kinds).toEqual(['article', 'tool']);
    const gh = result.link_highlights.find((l) => l.domain === 'github.com')!;
    expect(gh.kind).toBe('tool');
    expect(gh).toMatchObject({
      url: 'https://github.com/foo/bar',
      score: expect.any(Number),
      verdict: expect.any(String),
      count: expect.any(Number),
      group_count: expect.any(Number),
    });
  });

  it('surfaces topic lifecycle entries and content ideas from matched discussion', () => {
    seedMessages(SEED);

    const result = buildDashboardIntelligence(DATE, GROUP_NAMES);

    expect(result.topic_lifecycle.length).toBeGreaterThan(0);
    const topic = result.topic_lifecycle[0];
    expect(topic).toMatchObject({
      title: expect.any(String),
      status: expect.any(String),
      today_count: expect.any(Number),
      previous_avg: expect.any(Number),
      group_count: expect.any(Number),
      reason: expect.any(String),
      keywords: expect.any(Array),
    });
    expect(['rising', 'spreading', 'hot', 'cooling']).toContain(topic.status);

    expect(result.content_ideas.length).toBeGreaterThan(0);
    expect(result.content_ideas[0]).toMatchObject({
      title: expect.any(String),
      angle: expect.any(String),
      suggested_channel: expect.any(String),
      evidence: expect.any(String),
      source_count: expect.any(Number),
    });
  });

  it('resolves an empty day to a quiet_day anomaly (no messages on or before the date)', () => {
    // Seed only 2024-03-10; ask for an earlier date with nothing on/before it.
    seedMessages(SEED);

    const result = buildDashboardIntelligence('2024-03-05', GROUP_NAMES);

    // resolveIntelligenceDate finds no date <= 2024-03-05, so it keeps the input.
    expect(result.date).toBe('2024-03-05');
    expect(result.must_read).toEqual([]);
    expect(result.anomalies.some((a) => a.kind === 'quiet_day')).toBe(true);
  });
});

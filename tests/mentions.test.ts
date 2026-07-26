import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryDb } from './helpers/memory-db';

// `memDb` is assigned fresh in beforeEach. The mock factory below reads it
// lazily through the `() => memDb` closure, so it always sees the current
// per-test database instance (vi.mock is hoisted above imports, but the
// closure only reads `memDb` at call time, after beforeEach has run).
let memDb: ReturnType<typeof createMemoryDb>;

vi.mock('../lib/db', () => ({ db: () => memDb }));

// mentions.ts only imports `readConfig` from config. Provide a full, valid
// Config so `myNicknames` drives the mention needles (@我 / @Alice).
vi.mock('../lib/config', () => ({
  readConfig: () => ({
    myNicknames: ['我', 'Alice'],
    defaultRange: 'week',
    rescanConcurrency: 5,
    privacyConfirmed: true,
    setupCompleted: true,
    demoMode: false,
    defaultSyncDays: 7,
  }),
  DATA_DIR: '/tmp/wechat-radar-test',
}));

// mentions.ts imports `wxHistory` (used only by scanMentions, which we don't
// test here) — the import must still resolve, so stub it.
vi.mock('../lib/wx', () => ({ wxHistory: async () => [] }));

import {
  rebuildMentionIndexFromMessages,
  listMentions,
  countMentions,
  countMentionsSince,
  countMentionsBetween,
} from '../lib/mentions';

interface SeedMessage {
  chatroom_id: string;
  local_id: number;
  sender: string;
  content: string;
  time: string;
  timestamp: number;
}

function seedMessages(rows: SeedMessage[]) {
  const stmt = memDb.prepare(
    `INSERT INTO messages
       (chatroom_id, local_id, sender, content, time, timestamp, type, date)
     VALUES (?, ?, ?, ?, ?, ?, 'text', ?)`,
  );
  for (const r of rows) {
    stmt.run(r.chatroom_id, r.local_id, r.sender, r.content, r.time, r.timestamp, r.time.slice(0, 10));
  }
}

// Three of these five contain "@我" or "@Alice"; two do not.
// Note msg5 contains a bare "我" (不是我) WITHOUT a leading "@", so it must
// NOT match — this exercises the exact "@nickname" substring semantics.
const SEED: SeedMessage[] = [
  { chatroom_id: 'roomA', local_id: 1, sender: 'Bob', content: '@我 快看看这个消息', time: '2024-03-10 09:00:00', timestamp: 1000 }, // match
  { chatroom_id: 'roomA', local_id: 2, sender: 'Carol', content: '大家好 普通消息没有提及', time: '2024-03-10 09:01:00', timestamp: 1100 }, // no match
  { chatroom_id: 'roomB', local_id: 1, sender: 'Dave', content: 'Hey @Alice can you help me', time: '2024-03-10 09:02:00', timestamp: 1200 }, // match
  { chatroom_id: 'roomB', local_id: 2, sender: 'Eve', content: '@我 and @Alice both mentioned here', time: '2024-03-10 09:03:00', timestamp: 1300 }, // match
  { chatroom_id: 'roomC', local_id: 1, sender: 'Frank', content: '@Bob 这条不是我 也不是 alice', time: '2024-03-10 09:04:00', timestamp: 1400 }, // no match
];

beforeEach(() => {
  memDb = createMemoryDb();
});

describe('rebuildMentionIndexFromMessages', () => {
  it('indexes exactly the messages that mention a configured nickname', () => {
    seedMessages(SEED);

    const matched = rebuildMentionIndexFromMessages();
    expect(matched).toBe(3);

    const rows = memDb
      .prepare('SELECT chatroom_id, local_id FROM mentions ORDER BY timestamp ASC')
      .all() as Array<{ chatroom_id: string; local_id: number }>;
    expect(rows).toEqual([
      { chatroom_id: 'roomA', local_id: 1 },
      { chatroom_id: 'roomB', local_id: 1 },
      { chatroom_id: 'roomB', local_id: 2 },
    ]);

    // The bare-我 and plain messages must be absent.
    const frank = memDb
      .prepare("SELECT COUNT(*) AS n FROM mentions WHERE chatroom_id = 'roomC'")
      .get() as { n: number };
    expect(frank.n).toBe(0);
  });

  it('writes the mention index state into meta so it can be reused', () => {
    seedMessages(SEED);
    rebuildMentionIndexFromMessages();

    const meta = memDb
      .prepare("SELECT value FROM meta WHERE key = 'mention_index_state'")
      .get() as { value: string } | undefined;
    expect(meta).toBeDefined();
    const state = JSON.parse(meta!.value) as {
      signature: string;
      messageCount: number;
      maxTimestamp: number;
    };
    expect(state.messageCount).toBe(SEED.length);
    expect(state.maxTimestamp).toBe(1400);
    expect(JSON.parse(state.signature)).toEqual(['我', 'Alice']);
  });

  it('returns 0 and clears mentions when there are no matches', () => {
    seedMessages([
      { chatroom_id: 'roomA', local_id: 1, sender: 'Bob', content: '完全没有提及的普通消息', time: '2024-03-10 09:00:00', timestamp: 1000 },
    ]);

    const matched = rebuildMentionIndexFromMessages();
    expect(matched).toBe(0);
    const n = memDb.prepare('SELECT COUNT(*) AS n FROM mentions').get() as { n: number };
    expect(n.n).toBe(0);
  });
});

describe('listMentions', () => {
  it('returns rows ordered by timestamp DESC and rebuilds the index on demand', () => {
    seedMessages(SEED);

    // No explicit rebuild call: listMentions -> ensureMentionIndexCurrent
    // rebuilds because meta has no stored state yet.
    const all = listMentions();
    expect(all.map((m) => m.timestamp)).toEqual([1300, 1200, 1000]);
    expect(all.map((m) => m.sender)).toEqual(['Eve', 'Dave', 'Bob']);
  });

  it('respects the limit parameter', () => {
    seedMessages(SEED);
    const limited = listMentions(2);
    expect(limited).toHaveLength(2);
    expect(limited.map((m) => m.timestamp)).toEqual([1300, 1200]);
  });
});

describe('countMentions / countMentionsSince / countMentionsBetween', () => {
  beforeEach(() => {
    seedMessages(SEED);
  });

  it('countMentions returns the total mention count', () => {
    expect(countMentions()).toBe(3);
  });

  it('countMentionsSince filters on timestamp >= boundary (inclusive)', () => {
    expect(countMentionsSince(1000)).toBe(3); // all
    expect(countMentionsSince(1200)).toBe(2); // 1200 + 1300
    expect(countMentionsSince(1201)).toBe(1); // 1300 only
    expect(countMentionsSince(1401)).toBe(0);
  });

  it('countMentionsBetween filters on inclusive [since, until]', () => {
    expect(countMentionsBetween(1000, 1200)).toBe(2); // 1000 + 1200
    expect(countMentionsBetween(1201, 1300)).toBe(1); // 1300
    expect(countMentionsBetween(1301, 2000)).toBe(0);
    expect(countMentionsBetween(1000, 1400)).toBe(3);
  });
});

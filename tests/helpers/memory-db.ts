import Database from 'better-sqlite3';

/**
 * Creates a fresh in-memory SQLite database with the minimal schema needed by
 * the modules under test (`lib/mentions.ts` and `lib/dashboard-intelligence.ts`).
 *
 * Column definitions are copied verbatim from `lib/db.ts`. The database lives
 * only in memory (`:memory:`) and does NOT enable WAL, so tests never touch the
 * disk and stay stable/cross-platform (no Windows file-lock flake).
 */
export function createMemoryDb(): Database.Database {
  const d = new Database(':memory:');
  // Intentionally no `journal_mode = WAL` pragma: :memory: uses an in-RAM
  // journal and must never write files.
  d.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      chatroom_id TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      time TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (chatroom_id, local_id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chatroom_date ON messages(chatroom_id, date);
    CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);

    CREATE TABLE IF NOT EXISTS mentions (
      chatroom_id TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      time TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      seen INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (chatroom_id, local_id)
    );

    CREATE INDEX IF NOT EXISTS idx_mentions_time ON mentions(timestamp DESC);

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS message_links (
      chatroom_id TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      sender TEXT NOT NULL,
      time TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      url TEXT NOT NULL,
      canonical_url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      domain TEXT NOT NULL,
      source TEXT NOT NULL,
      raw_kind TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (chatroom_id, local_id, canonical_url)
    );

    CREATE INDEX IF NOT EXISTS idx_message_links_date
      ON message_links(date, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_message_links_canonical
      ON message_links(canonical_url);
    CREATE INDEX IF NOT EXISTS idx_message_links_domain
      ON message_links(domain);
    CREATE INDEX IF NOT EXISTS idx_message_links_source
      ON message_links(source);

    CREATE TABLE IF NOT EXISTS daily_stats (
      chatroom_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total INTEGER NOT NULL,
      top_senders TEXT NOT NULL,
      by_hour TEXT NOT NULL,
      refreshed_at INTEGER NOT NULL,
      PRIMARY KEY (chatroom_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
  `);
  return d;
}

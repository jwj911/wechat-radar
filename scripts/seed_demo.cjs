/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require('better-sqlite3');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { homedir } = require('node:os');
const { dirname, join } = require('node:path');

const dataDir = process.env.WECHAT_RADAR_DATA_DIR || join(homedir(), '.wechat-radar');
const dbPath = join(dataDir, 'radar.db');
if (!existsSync(dirname(dbPath))) mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL, emoji TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS daily_stats (chatroom_id TEXT NOT NULL, date TEXT NOT NULL, total INTEGER NOT NULL, top_senders TEXT NOT NULL, by_hour TEXT NOT NULL, refreshed_at INTEGER NOT NULL, PRIMARY KEY (chatroom_id, date));
CREATE TABLE IF NOT EXISTS messages (chatroom_id TEXT NOT NULL, local_id INTEGER NOT NULL, sender TEXT NOT NULL, content TEXT NOT NULL, time TEXT NOT NULL, timestamp INTEGER NOT NULL, type TEXT NOT NULL, date TEXT NOT NULL, PRIMARY KEY (chatroom_id, local_id));
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date);
`);

const categories = [
  ['AI / Coding', '#7dd3a8', '💻'], ['Tools', '#f59e0b', '🛠️'], ['Articles', '#06b6d4', '📚'],
  ['Business', '#10b981', '💼'], ['Events', '#f97316', '📅'], ['Research', '#a855f7', '🔬'], ['Lifestyle', '#fb7185', '🏠'],
];
const now = Date.now();
const insertGroup = db.prepare('INSERT OR IGNORE INTO groups (name, color, emoji, sort_order, created_at) VALUES (?, ?, ?, ?, ?)');
categories.forEach((g, i) => insertGroup.run(g[0], g[1], g[2], i, now));

const { groups, senders, contents } = require('./demo-dataset.json');
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const insertMessage = db.prepare('INSERT OR IGNORE INTO messages (chatroom_id, local_id, sender, content, time, timestamp, type, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const insertStats = db.prepare('INSERT INTO daily_stats (chatroom_id, date, total, top_senders, by_hour, refreshed_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(chatroom_id, date) DO UPDATE SET total = excluded.total, top_senders = excluded.top_senders, by_hour = excluded.by_hour, refreshed_at = excluded.refreshed_at');

db.transaction(() => {
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const d = new Date(); d.setDate(d.getDate() - dayOffset);
    const date = ymd(d);
    for (let gi = 0; gi < groups.length; gi++) {
      const chatroomId = groups[gi].id;
      const count = Math.max(8, 42 - dayOffset * 2 + gi * 5);
      const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour >= 9 && hour <= 23 ? Math.floor(count / 15) + ((hour + gi) % 3) : 0 }));
      const topSenders = senders.slice(0, 3).map((sender, index) => ({ sender, count: Math.max(1, Math.floor(count / (index + 2))) }));
      insertStats.run(chatroomId, date, count, JSON.stringify(topSenders), JSON.stringify(byHour), Date.now());
      for (let i = 0; i < Math.min(count, 18); i++) {
        const localId = dayOffset * 10000 + gi * 1000 + i + 1;
        const hour = 9 + ((i + gi) % 12);
        const minute = (i * 7) % 60;
        const time = `${date} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        insertMessage.run(chatroomId, localId, senders[(i + gi) % senders.length], contents[(i + gi + dayOffset) % contents.length], time, Math.floor(new Date(time).getTime() / 1000), 'text', date);
      }
    }
  }
})();

writeFileSync(join(dataDir, 'config.json'), JSON.stringify({ myNicknames: ['你的微信名'], defaultRange: 'week', rescanConcurrency: 5, privacyConfirmed: true, setupCompleted: true, demoMode: true, defaultSyncDays: 7 }, null, 2));
console.log(`Seeded demo data at ${dbPath}`);

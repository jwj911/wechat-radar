import { db } from './db';
import { writeConfig } from './config';
import demoDataset from '../scripts/demo-dataset.json';

const GROUPS = demoDataset.groups;
const SENDERS = demoDataset.senders;
const CONTENTS = demoDataset.contents;

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function seedDemoData() {
  const database = db();
  const now = new Date();
  const insertMessage = database.prepare(`
    INSERT OR IGNORE INTO messages
      (chatroom_id, local_id, sender, content, time, timestamp, type, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertStats = database.prepare(`
    INSERT INTO daily_stats (chatroom_id, date, total, top_senders, by_hour, refreshed_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(chatroom_id, date) DO UPDATE SET
      total = excluded.total,
      top_senders = excluded.top_senders,
      by_hour = excluded.by_hour,
      refreshed_at = excluded.refreshed_at
  `);

  database.transaction(() => {
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const d = new Date(now);
      d.setDate(now.getDate() - dayOffset);
      const date = ymd(d);
      for (let gi = 0; gi < GROUPS.length; gi++) {
        const group = GROUPS[gi];
        const count = Math.max(8, 42 - dayOffset * 2 + gi * 5);
        const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour >= 9 && hour <= 23 ? Math.floor(count / 15) + ((hour + gi) % 3) : 0 }));
        const topSenders = SENDERS.slice(0, 3).map((sender, index) => ({ sender, count: Math.max(1, Math.floor(count / (index + 2))) }));
        insertStats.run(group.id, date, count, JSON.stringify(topSenders), JSON.stringify(byHour), Date.now());
        for (let i = 0; i < Math.min(count, 18); i++) {
          const localId = dayOffset * 10000 + gi * 1000 + i + 1;
          const hour = 9 + ((i + gi) % 12);
          const minute = (i * 7) % 60;
          const time = `${date} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
          const timestamp = Math.floor(new Date(time).getTime() / 1000);
          insertMessage.run(group.id, localId, SENDERS[(i + gi) % SENDERS.length], CONTENTS[(i + gi + dayOffset) % CONTENTS.length], time, timestamp, 'text', date);
        }
      }
    }
  })();

  writeConfig({
    demoMode: true,
    setupCompleted: true,
    privacyConfirmed: true,
    myNicknames: ['你的微信名'],
  });

  return { groups: GROUPS.length, days: 14 };
}

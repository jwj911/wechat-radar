import { NextRequest } from 'next/server';
import { buildTopicsForDate } from '@/lib/topics';
import { normalizeDate } from '@/lib/range';

export const dynamic = 'force-dynamic';
export const maxDuration = 1800; // 30 min

interface BuildBody {
  date?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as BuildBody;
  const date = normalizeDate(body.date);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({ type: 'start', date });

      try {
        const result = await buildTopicsForDate(date, (p) => send(p));
        send({ type: 'finished', ok: true, topics: result.topics, messages: result.messages });
      } catch (e) {
        send({ type: 'error', error: e instanceof Error ? e.message : 'unknown' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

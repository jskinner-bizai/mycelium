/**
 * mycelium starter recipe — a runnable minimum viable organism.
 *
 * Three organs talking through a single NoopAdapter bus:
 *   - sense     : publishes fake motion events every 3s
 *   - reflex    : subscribes to motion, publishes light-on
 *   - dashboard : subscribes to both, prints
 *
 * A supervisor keeps all three alive with exponential-backoff restart.
 *
 * Run: `npx tsx example.ts`
 */

import { Bus, NoopAdapter, Supervisor } from '@mycelium/core';

const ROOMS = ['kitchen', 'hallway', 'bedroom', 'entry'] as const;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const bus = new Bus({ adapter: new NoopAdapter(), logPath: './events.db' });
await bus.connect();

const sup = new Supervisor({
  notify: (e) => console.log(`[supervisor] ${e.type} ${e.name}`),
});

sup.register({
  name: 'sense',
  run: async () => {
    for (;;) {
      const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
      await bus.publish('motion:detected', { room, ts: Date.now() });
      await wait(3000);
    }
  },
});

sup.register({
  name: 'reflex',
  run: async () => {
    bus.on('motion:detected', async (payload) => {
      const { room } = payload as { room: string };
      await bus.publish('light:turn-on', { room });
    });
    // stay alive
    await new Promise(() => {});
  },
});

sup.register({
  name: 'dashboard',
  run: async () => {
    bus.on('motion:detected', (p) => console.log('[dashboard] motion:detected ', p));
    bus.on('light:turn-on', (p) => console.log('[dashboard] light:turn-on    ', p));
    await new Promise(() => {});
  },
});

await sup.start();

// graceful shutdown
const shutdown = async () => {
  console.log('\n[starter] shutting down...');
  await sup.stop();
  await bus.disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

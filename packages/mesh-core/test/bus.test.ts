import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Bus } from '../src/bus.js';
import { NoopAdapter } from '../src/adapters/noop.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Bus (no persistence)', () => {
  it('routes publish → on for same topic', async () => {
    const bus = new Bus({ adapter: new NoopAdapter() });
    await bus.connect();
    const got: unknown[] = [];
    bus.on('motion:detected', (p) => got.push(p));
    await bus.publish('motion:detected', { camera: 'front-door' });
    expect(got).toEqual([{ camera: 'front-door' }]);
    await bus.disconnect();
  });

  it('isolates topics', async () => {
    const bus = new Bus({ adapter: new NoopAdapter() });
    await bus.connect();
    const got: unknown[] = [];
    bus.on('a', (p) => got.push(p));
    await bus.publish('b', 1);
    expect(got).toEqual([]);
    await bus.disconnect();
  });

  it('throws if publish is called before connect', async () => {
    const bus = new Bus({ adapter: new NoopAdapter() });
    await expect(bus.publish('a', 1)).rejects.toThrow(/not connected/i);
  });
});

describe('Bus (with event log)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mycelium-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('persists published events to sqlite log', async () => {
    const bus = new Bus({
      adapter: new NoopAdapter(),
      logPath: join(dir, 'events.db'),
    });
    await bus.connect();
    await bus.publish('a', { n: 1 });
    await bus.publish('a', { n: 2 });
    await bus.publish('b', { n: 3 });

    const replayed: Array<{ topic: string; payload: unknown }> = [];
    for (const e of bus.replay('a')) {
      replayed.push({ topic: e.topic, payload: e.payload });
    }
    expect(replayed).toEqual([
      { topic: 'a', payload: { n: 1 } },
      { topic: 'a', payload: { n: 2 } },
    ]);
    await bus.disconnect();
  });

  it('replay returns empty iterable when no log path configured', async () => {
    const bus = new Bus({ adapter: new NoopAdapter() });
    await bus.connect();
    expect([...bus.replay('a')]).toEqual([]);
    await bus.disconnect();
  });
});

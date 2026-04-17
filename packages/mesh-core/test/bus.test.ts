import { describe, it, expect } from 'vitest';
import { Bus } from '../src/bus.js';
import { NoopAdapter } from '../src/adapters/noop.js';

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

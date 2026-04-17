import { describe, it, expect } from 'vitest';
import { NoopAdapter } from '../src/adapters/noop.js';

describe('NoopAdapter', () => {
  it('delivers published payloads to subscribers of the same topic', async () => {
    const a = new NoopAdapter();
    await a.connect();
    const received: unknown[] = [];
    a.subscribe('t/one', (p) => received.push(p));
    await a.publish('t/one', { hello: 'world' });
    expect(received).toEqual([{ hello: 'world' }]);
    await a.disconnect();
  });

  it('does not deliver to subscribers of other topics', async () => {
    const a = new NoopAdapter();
    await a.connect();
    const received: unknown[] = [];
    a.subscribe('t/one', (p) => received.push(p));
    await a.publish('t/two', { x: 1 });
    expect(received).toEqual([]);
    await a.disconnect();
  });

  it('supports multiple subscribers on the same topic', async () => {
    const a = new NoopAdapter();
    await a.connect();
    const out: number[] = [];
    a.subscribe('t', () => out.push(1));
    a.subscribe('t', () => out.push(2));
    await a.publish('t', null);
    expect(out.sort()).toEqual([1, 2]);
    await a.disconnect();
  });
});

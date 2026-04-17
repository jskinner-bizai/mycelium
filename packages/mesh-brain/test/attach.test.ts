import { Bus, NoopAdapter } from '@mycelium/core';
import { describe, expect, it } from 'vitest';
import { attachBrain } from '../src/attach.js';
import type { Brain } from '../src/brain.js';

describe('attachBrain', () => {
  it('forwards subscribed events through the brain and publishes intents', async () => {
    const published: Array<{ topic: string; payload: unknown }> = [];
    const bus = new Bus({ adapter: new NoopAdapter() });
    await bus.connect();

    bus.on('light:turn-on', (p) => {
      published.push({ topic: 'light:turn-on', payload: p });
    });

    const fakeBrain: Brain = {
      reflect: async (event) => [{ topic: 'light:turn-on', payload: event.payload }],
    };

    attachBrain(fakeBrain, { bus, subscribe: ['motion:detected'] });
    await bus.publish('motion:detected', { room: 'kitchen' });

    await new Promise((r) => setTimeout(r, 20));
    expect(published).toEqual([{ topic: 'light:turn-on', payload: { room: 'kitchen' } }]);

    await bus.disconnect();
  });

  it('respects the filter option', async () => {
    let reflectCalls = 0;
    const bus = new Bus({ adapter: new NoopAdapter() });
    await bus.connect();

    const fakeBrain: Brain = {
      reflect: async () => {
        reflectCalls++;
        return [];
      },
    };

    attachBrain(fakeBrain, {
      bus,
      subscribe: ['t'],
      filter: (e) => (e.payload as { important?: boolean }).important === true,
    });

    await bus.publish('t', { important: false });
    await bus.publish('t', { important: true });

    await new Promise((r) => setTimeout(r, 20));
    expect(reflectCalls).toBe(1);

    await bus.disconnect();
  });
});

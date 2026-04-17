import type { Bus } from '@mycelium/core';
import type { Brain, BrainInput } from './brain.js';

export interface AttachBrainOptions {
  bus: Bus;
  /** Topics the brain should react to. */
  subscribe: string[];
  /** Optional per-event filter — return false to skip. */
  filter?: (event: BrainInput) => boolean;
  /** Optional maximum recent events to include in context (default 20). */
  contextWindow?: number;
}

/**
 * Wires a Brain into a Bus. For every event on the subscribed topics:
 *   1. The brain's `reflect` is called with the event + recent context.
 *   2. Any returned intents are published back to the bus.
 *
 * The function returns a handle with `detach()` for clean shutdown.
 */
export function attachBrain(brain: Brain, opts: AttachBrainOptions): { detach: () => void } {
  const contextWindow = opts.contextWindow ?? 20;
  const recent: Array<{ topic: string; payload: unknown; ts: number }> = [];
  let attached = true;

  const handle = async (topic: string, payload: unknown) => {
    if (!attached) return;
    const event: BrainInput = { topic, payload, context: { recent: [...recent] } };
    if (opts.filter && !opts.filter(event)) return;
    try {
      const intents = await brain.reflect(event);
      for (const intent of intents) {
        await opts.bus.publish(intent.topic, intent.payload);
      }
    } catch (err) {
      console.error('[brain] reflect failed:', err);
    }
  };

  for (const topic of opts.subscribe) {
    opts.bus.on(topic, (p) => {
      recent.push({ topic, payload: p, ts: Date.now() });
      while (recent.length > contextWindow) recent.shift();
      void handle(topic, p);
    });
  }

  return {
    detach() {
      attached = false;
    },
  };
}

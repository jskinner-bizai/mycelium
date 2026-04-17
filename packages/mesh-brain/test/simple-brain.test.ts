import { describe, expect, it } from 'vitest';
import { SimpleBrain } from '../src/simple-brain.js';

describe('SimpleBrain', () => {
  it('parses a JSON array of intents from the model response', async () => {
    const brain = new SimpleBrain({
      complete: async () =>
        '[{"topic":"light:turn-on","payload":{"room":"kitchen"},"rationale":"motion"}]',
    });
    const intents = await brain.reflect({ topic: 'motion:detected', payload: { room: 'kitchen' } });
    expect(intents).toEqual([
      { topic: 'light:turn-on', payload: { room: 'kitchen' }, rationale: 'motion' },
    ]);
  });

  it('returns empty array when model produces no JSON', async () => {
    const brain = new SimpleBrain({ complete: async () => 'I decline to act.' });
    const intents = await brain.reflect({ topic: 't', payload: 1 });
    expect(intents).toEqual([]);
  });

  it('tolerates prose before and after the JSON array', async () => {
    const brain = new SimpleBrain({
      complete: async () => 'Here is my response:\n[{"topic":"x","payload":1}]\nThank you.',
    });
    const intents = await brain.reflect({ topic: 't', payload: 1 });
    expect(intents).toEqual([{ topic: 'x', payload: 1, rationale: undefined }]);
  });

  it('drops intents missing a topic field', async () => {
    const brain = new SimpleBrain({
      complete: async () => '[{"payload":"no topic"},{"topic":"y","payload":2}]',
    });
    const intents = await brain.reflect({ topic: 't', payload: 1 });
    expect(intents).toEqual([{ topic: 'y', payload: 2, rationale: undefined }]);
  });
});

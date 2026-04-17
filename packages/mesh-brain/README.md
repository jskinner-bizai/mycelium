# @mycelium/brain

The organism's reasoning organ.

`@mycelium/brain` ships a minimal `Brain` contract, a provider-agnostic reference implementation (`SimpleBrain`), and an `attachBrain` helper that wires the brain into an existing `@mycelium/core` Bus.

mycelium does not prescribe a language model. You pass in a `complete(prompt)` callback. Point it at Claude, OpenAI, Ollama, LiteLLM, or a private service of your own.

## Install

```bash
pnpm add @mycelium/brain @mycelium/core
```

## Use

```ts
import { Bus, NoopAdapter } from '@mycelium/core';
import { SimpleBrain, attachBrain } from '@mycelium/brain';

const bus = new Bus({ adapter: new NoopAdapter() });
await bus.connect();

const brain = new SimpleBrain({
  complete: async (prompt) => {
    // your model call — any provider. Return the model's text response.
    const res = await fetch('https://your-llm-endpoint', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.LLM_API_KEY}` },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    return data.text;
  },
});

attachBrain(brain, {
  bus,
  subscribe: ['motion:detected', 'vision:face-recognized', 'presence:arrived'],
});
```

## Contract

A `Brain` must implement `reflect(event) → Promise<Intent[]>`. Optional methods `remember()` and `ask()` may also be provided for memory and out-of-band Q&A.

See the [architecture docs](../../docs/architecture.md) and the [`docs/brain.md` contract](../../docs/brain.md) for the full picture.

## License

Apache-2.0.

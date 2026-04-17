# Brain

The brain is the organism's reasoning organ. It thinks in language, holds long-term memory, and forms *intent* — the thing that distinguishes a reflex ("motion → light on") from a decision ("at 2 AM, unfamiliar face, porch light was off five minutes ago: notify + arm").

Every mycelium organism has **exactly one brain slot**. The slot is public; the implementation is yours.

## What the brain is responsible for

| Responsibility | Belongs to the brain? |
|---|---|
| Decide whether an event warrants a response | ✓ |
| Combine multiple signals into a narrative | ✓ |
| Remember people, places, and patterns | ✓ |
| Summarize the last N hours into a briefing | ✓ |
| Propose changes to the organism (new adapter, new reflex) | ✓ |
| Turn a light on when motion fires | ✗ *(that's autonomic)* |
| Deliver a certainty guarantee under 100 ms | ✗ *(reflexes own that)* |
| Encode domain-specific safety rules | ✗ *(immune system owns those)* |

The brain is slow, probabilistic, and occasionally wrong. That's why it's **one organ among many**, not the whole organism. Reflexes run through the autonomic nervous system; the brain's role is context and judgment.

## The contract

```ts
interface Brain {
  reflect(event: BrainInput): Promise<Intent[]>;
  remember?(note: string, metadata?: Record<string, unknown>): Promise<void>;
  ask?(question: string): Promise<string>;
}

interface BrainInput {
  topic: string;
  payload: unknown;
  context?: { recent?: Array<{ topic: string; payload: unknown; ts: number }> };
}

interface Intent {
  topic: string;
  payload: unknown;
  rationale?: string;
}
```

That's the whole surface. Three methods — `reflect` is required, `remember` and `ask` are optional — and three types.

Wire it with `@mycelium/brain`'s `attachBrain(brain, { bus, subscribe: [...] })`. See [`packages/mesh-brain`](../packages/mesh-brain/README.md) for a reference `SimpleBrain` that takes any `complete(prompt) => Promise<string>` callback, so you can plug in Claude, OpenAI, Ollama, LiteLLM, or a private service you build and keep private.

## Topic conventions

Brains generally publish on `brain:*`:

| Topic | Meaning |
|---|---|
| `brain:intent` | A proposed action, rationale included |
| `brain:reflection` | A free-form observation (going into memory, not necessarily acting) |
| `brain:question` | The brain is asking another organ something (rare) |
| `brain:answer` | Response to a `brain:question` |

And subscribes to whatever events you decide matter — typically a mix of senses (`motion:*`, `presence:*`, `calendar:*`), eyes (`vision:*`), autonomic feedback (`lock:state`, `light:state`), and the immune system's findings (`security:alert`, `anomaly:detected`).

## Memory

mycelium doesn't prescribe where the brain's memory lives. Three common patterns:

1. **Ephemeral** — context window only, no persistence. Simplest.
2. **Bus-log as memory** — `Bus.replay(topic)` for short-term recall; the SQLite event log *is* the memory.
3. **External store** — a vector DB, a Notion workspace, a private service you maintain. The brain reaches out via its own adapter.

The `remember()` method is there so concrete brains can expose whichever strategy they pick, without the rest of the organism caring.

## Safety considerations

- **Never gate reflexes on the brain.** If a fire alarm event needs a response in seconds, it runs through autonomic NS, not through an LLM call.
- **Always rate-limit.** A chatty brain can fire intents faster than your budget tolerates. Apply token + call budgets at the adapter layer.
- **Log every intent.** The `rationale` field is there for a reason — so humans can audit what the brain was thinking after the fact.
- **Human-in-the-loop for irreversible actions.** Unlocking a door, rotating a credential, deleting data — gate these through a review step. The brain can *propose*; a human or a policy engine *approves*.

## Privacy

The brain sees everything that passes through the topics it subscribes to. If your organism collects sensitive signals (health data, location, conversations), think carefully about whether they should be in the brain's context. Options:

- **Subscribe narrowly.** The brain only gets what it needs to do its job.
- **Redact on the way in.** A sanitizing organ sits between the sensitive source and the brain's subscribed topic, dropping or hashing fields.
- **Run the brain locally.** Ollama on a box you own keeps the content on your network.

## Multiple brains

Nothing stops you from running more than one. Common patterns:

- **Fast + slow.** A tiny local model handles routine events; a larger remote model is called only when the small one escalates.
- **Specialist + generalist.** A security brain subscribes only to `security:*`; a general brain subscribes to everything else.
- **Ensemble.** Two brains reflect on the same event; a voting organ publishes only intents both agreed on.

All of these are just multiple `Brain` implementations attached to the same `Bus`. The contract is small enough to compose.

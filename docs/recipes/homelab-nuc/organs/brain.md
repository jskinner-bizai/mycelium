# brain — reasoning organ

The brain in this recipe is whatever LLM-backed service you decide to run. mycelium doesn't ship an opinionated brain; it ships a contract (`@mycelium/brain`) and a reference `SimpleBrain` that takes a `complete(prompt) => Promise<string>` callback.

Pick one of the lanes below.

## Lane A — local-only brain (privacy-maximal)

Run a model yourself, on hardware you own. No cloud calls, no tokens to leak.

- **Ollama.** Download, run `ollama serve`, expose `:11434`. Model of your choice — a 7-8 B model (Llama 3, Mistral, Qwen) fits on a recent GPU or even CPU-only for occasional reflection.
- **LocalAI / vLLM / llama.cpp server.** Same shape as Ollama — an HTTP endpoint that returns a text completion.

Wiring:

```ts
import { SimpleBrain, attachBrain } from '@mycelium/brain';

const brain = new SimpleBrain({
  complete: async (prompt) => {
    const res = await fetch('http://<your-host>:11434/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'llama3', prompt, stream: false }),
    });
    const data = await res.json();
    return data.response;
  },
});

attachBrain(brain, {
  bus,
  subscribe: ['motion:detected', 'vision:face-recognized', 'presence:arrived', 'calendar:tick'],
});
```

## Lane B — hosted API brain (capability-maximal)

A managed model with strong reasoning. Higher capability, tokens leave your network. Trade-off.

```ts
const brain = new SimpleBrain({
  complete: async (prompt) => {
    const res = await fetch('<your-provider-endpoint>', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({ model: '<your-model>', prompt }),
    });
    const data = await res.json();
    return data.text;
  },
});
```

Secrets go in `.env`, **never** the repo.

## Lane C — private brain service

Run your own reasoning service (could be anywhere — another host, a small cloud VM, a private MCP server). Same shape as Lane B: you wrap its HTTP API in a `complete()` callback and pass it to `SimpleBrain`. Or implement the `Brain` interface directly if your service does something more than plain chat completion.

## Rate limiting

A chatty brain breaks your budget. Wrap `complete` in a rate limiter before you hand it to `SimpleBrain`:

```ts
import pLimit from 'p-limit';

const limit = pLimit(2); // max 2 in-flight model calls
const gated = (fn: typeof complete) => (prompt: string) => limit(() => fn(prompt));

const brain = new SimpleBrain({ complete: gated(complete) });
```

## What the brain should subscribe to in this recipe

Start narrow. The default recommendation:

```
motion:detected          — only when the room has been empty for a while
vision:face-recognized   — always
vision:plate-recognized  — always
vision:package           — always
vision:visitor           — always
presence:arrived         — always
calendar:tick            — daily, for the briefing only
security:alert           — always (brain writes the human-readable version)
```

Skip the firehose topics (`ambient:reading`, `health:sample`, anything high-frequency) unless you have a specific intent that needs them. The brain is expensive; reflexes are cheap.

## Memory

Three options, all fine:

- **Ephemeral** — context window only. `SimpleBrain` does this by default via the `recent` array from `attachBrain`.
- **Bus-log as memory** — `Bus.replay('brain:reflection')` gives you everything the brain has previously noted. Add a `remember()` method that publishes a `brain:reflection` event.
- **External store** — vector DB, notes system, private graph. Wrap it in your own `Brain` implementation if the existing `SimpleBrain` + callback model isn't enough.

## Privacy checklist

- The brain sees every event on the topics it subscribes to. Audit your subscription list.
- If you publish health or location data, consider running the brain locally (Lane A) or adding a redaction organ between those senses and the brain's subscribed topics.
- Log every `brain:intent` to the event log. If something surprising happens, `Bus.replay('brain:intent')` gives you an audit trail with rationales.

## Wiring it into the recipe

The brain runs as a `SupervisedTask`:

```ts
import { Bus, MqttAdapter, Supervisor } from '@mycelium/core';
import { SimpleBrain, attachBrain } from '@mycelium/brain';

const bus = new Bus({
  adapter: new MqttAdapter({
    url: `mqtt://<mqtt-broker>:1883`,
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASSWORD,
  }),
  logPath: '/var/lib/mycelium/events.db',
});
await bus.connect();

const brain = new SimpleBrain({ complete: /* your callback */ });
attachBrain(brain, { bus, subscribe: [/* see list above */] });

const sup = new Supervisor();
sup.register({
  name: 'brain',
  run: async () => {
    // attachBrain already registered subscriptions; keep the process alive.
    await new Promise(() => {});
  },
  backoff: { initialMs: 1000, maxMs: 30_000, factor: 2 },
});
await sup.start();
```

Deploy the brain process behind systemd, or as a container under the same hypervisor, or as a plain `tsx` process — all fine.

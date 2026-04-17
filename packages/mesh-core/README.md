# @mycelium/core

The substrate. Three primitives for building a mesh of cooperating services:

- **`Bus`** — publish/subscribe over any `Adapter`, with optional SQLite event log + replay.
- **`Supervisor`** — register long-running tasks, detect failure, restart with exponential backoff.
- **`Adapter`** — the interface everything talks through. Ships with `NoopAdapter` (in-memory), `MqttAdapter` (real broker), and `HttpAdapter` (webhook-style).

```ts
import { Bus, Supervisor, MqttAdapter } from '@mycelium/core';

const bus = new Bus({
  adapter: new MqttAdapter({ url: 'mqtt://localhost:1883' }),
  logPath: './events.db',
});
await bus.connect();

bus.on('motion:detected', (payload) => {
  console.log('motion', payload);
});

await bus.publish('motion:detected', { camera: 'front-door', ts: Date.now() });
```

## Why

Every piece of the mycelium organism talks through the Bus. Adapters let the same mesh run against MQTT in production, an HTTP webhook for cloud-to-local hops, or `NoopAdapter` in tests. The Supervisor keeps it alive.

## Install

```bash
pnpm add @mycelium/core
```

## License

Apache-2.0.

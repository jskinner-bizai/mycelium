# Architecture

A concrete mapping of organs to implementations. Nothing here is required — if you don't have a Home Assistant instance, swap the autonomic-NS row for your device controller. The pattern is the load-bearing part; the specific software is not.

## The organ map

| Organ | Role | Reference implementation | Talks to the bus via |
|---|---|---|---|
| **Brain** | central intelligence, memory, intent | any LLM via [`@mycelium/brain`](../packages/mesh-brain/README.md) · [contract](brain.md) | HttpAdapter (webhook) or MqttAdapter |
| **Skeleton + muscles** | agent execution, tool use | any agent runtime / gateway | MqttAdapter |
| **Autonomic nervous system** | reflex device control | Home Assistant (or equivalent) | MqttAdapter |
| **Eyes** | vision AI, detection, recognition | Frigate (or equivalent) | MQTT (Frigate publishes natively) |
| **Spinal cord** | the event bus itself | `@mycelium/core` `Bus` | — |
| **Senses** | ambient/health/calendar ingesters | custom adapters per source | HttpAdapter or MqttAdapter |
| **Limbs** | external tools (notes, email, calendar, code) | per-tool adapters | HttpAdapter |
| **Immune system** | supervisor + security watchers | `@mycelium/core` `Supervisor` + custom agents | — |
| **Skin** | observable state — dashboards, kiosks | read-only subscribers | MqttAdapter |

## Data flow

```
  senses ─┐
           │
  eyes ───┼──> bus (publish) ──> brain (subscribe) ──> muscles
           │                  └──> autonomic NS (subscribe) ──> devices
           │                  └──> limbs (subscribe) ──> external tools
  skin <──┘ (bus subscribers render state)

  immune system watches the bus for anomalies and publishes responses.
  supervisor watches processes; failures become events too.
```

Every arrow is a topic. Every node is an independent process. No node knows about any other node except through topic contracts.

## Topic conventions

Dotted/colon hybrid, short, lower-kebab:

```
motion:detected
motion:cleared
vision:face-recognized
light:turn-on
light:turn-off
security:alert
security:resolved
presence:arrived
presence:left
supervisor:failed
supervisor:restarted
brain:intent
brain:reflection
```

Document your topics in `docs/recipes/<name>/topics.md` when you ship a recipe.

## Durability model

- Every `publish` to a `Bus` with a configured `logPath` lands in a SQLite row with `(ts, topic, payload)`.
- `Bus.replay(topic)` returns a synchronous iterator of logged events in timestamp order.
- No automatic retention policy — that's a recipe concern.

## Failure model

- **Adapter-level failure** (broker down): subscribers keep their handlers registered; publishers get errors from `publish()` they must handle.
- **Service-level failure** (an organ crashes): Supervisor restarts with exponential backoff; publishes `supervisor:failed` and `supervisor:restarted` events.
- **Whole-host failure**: out of scope for mesh-core; handle with your deployment layer.

## Extending

A new organ is:

1. A process.
2. An `Adapter` instance (usually `MqttAdapter`).
3. A `Bus` built on that adapter.
4. Zero or more `bus.on(...)` subscriptions and `bus.publish(...)` calls.
5. Optional: registration with a `Supervisor` for restart-on-failure.

No framework. No plugin API. No config file format to learn. It's just a library.

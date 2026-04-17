# immune system — self-defense, self-healing

The immune system is not a single process. It's a pattern: small, focused watchers that each own one class of threat, and together they hold the organism together. All of them publish to `security:*`, `anomaly:*`, `cost:*`, or `supervisor:*` so the rest of the organism can react, and a human audit trail is intact.

## Two layers

**Layer 1: keep the organism alive** (*self-healing*)
- Process supervisor restarts crashed organs with backoff
- Health checkers ping each organ and raise anomalies when they go silent
- A circuit breaker pauses cloud-dependent organs when upstream is down

**Layer 2: defend against threats** (*self-defending*)
- Intrusion watcher: subscribes to `vision:person`, cross-references with `presence:*`, publishes `security:alert` when a person appears while no one is supposed to be home
- Anomaly watcher: statistical baselines on `health:sample`, `ambient:reading`, device power draw — publishes `anomaly:detected` on outliers
- Cost budget watcher: polls LLM/API spend, publishes `cost:budget-exceeded` when thresholds cross
- Credential hygiene watcher: inspects the event log for anything that looks like a leaked secret and fires a `security:alert`

Each watcher is a `SupervisedTask`. Each is 50–200 lines. Compose to taste.

## The process supervisor (Layer 1)

Every long-running organ registers with the `Supervisor` from `@mycelium/core`. When anything crashes, the supervisor restarts with exponential backoff and publishes `supervisor:failed` / `supervisor:restarted` events:

```ts
import { Bus, MqttAdapter, Supervisor } from '@mycelium/core';

const bus = /* ... */;
const sup = new Supervisor({
  notify: async (e) => {
    await bus.publish(`supervisor:${e.type === 'failed' ? 'failed' : e.type === 'restarted' ? 'restarted' : 'info'}`, e);
  },
});

sup.register({ name: 'brain',         run: runBrainLoop });
sup.register({ name: 'vision-translator', run: runVisionTranslator });
sup.register({ name: 'health-ingester',   run: runHealthIngester });
sup.register({ name: 'cost-watcher',      run: runCostWatcher });
await sup.start();
```

The supervisor *is* the autonomic reflex for process failure. Everything else in Layer 1 is downstream of it.

## Intrusion watcher (Layer 2)

A minimal example. Subscribes to vision + presence, evaluates a simple rule, publishes alerts.

```ts
type PresenceState = 'home' | 'away' | 'unknown';
let presence: PresenceState = 'unknown';

bus.on('presence:arrived', () => { presence = 'home'; });
bus.on('presence:left', () => { presence = 'away'; });

bus.on('vision:person', async (payload) => {
  const p = payload as { camera: string; confidence: number };
  if (p.confidence < 0.7) return;
  if (presence === 'home') return;
  await bus.publish('security:alert', {
    kind: 'intrusion',
    details: `Unrecognized person at ${p.camera} while no one is home`,
    evidence: { camera: p.camera, confidence: p.confidence, presence },
  });
});
```

The brain subscribes to `security:alert` and writes the human-readable version. The autonomic NS subscribes too, and can engage locks + flash lights. One event, three coordinated responses.

## Anomaly watcher

Pattern: rolling baseline + standard-deviation gate. Works for anything numeric.

```ts
const baseline = new Map<string, number[]>();

bus.on('health:sample', async (payload) => {
  const s = payload as { metric: string; value: number };
  const arr = baseline.get(s.metric) ?? [];
  arr.push(s.value);
  if (arr.length > 100) arr.shift();
  baseline.set(s.metric, arr);

  if (arr.length < 30) return; // need history first
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
  const z = (s.value - mean) / (sd || 1);
  if (Math.abs(z) > 3) {
    await bus.publish('anomaly:detected', {
      source: 'health',
      metric: s.metric,
      value: s.value,
      expected: `±3σ of ${mean.toFixed(2)}`,
    });
  }
});
```

Use the same pattern for `ambient:reading`, device power draw (publish it from HA), or anything else that has a "normal" distribution.

## Cost budget watcher

When your brain is an API call, every reflection has a price. Watch it.

```ts
const budget = { day_usd: 2, month_usd: 30 };
let spentToday = 0;
let spentMonth = 0;

// Publish this every time a brain call completes
bus.on('brain:intent', async (payload) => {
  const costUsd = (payload as { _cost_usd?: number })._cost_usd ?? 0;
  spentToday += costUsd;
  spentMonth += costUsd;
  if (spentToday > budget.day_usd) {
    await bus.publish('cost:budget-exceeded', {
      service: 'brain',
      window: 'day',
      spent_usd: spentToday,
      limit_usd: budget.day_usd,
    });
  }
  if (spentMonth > budget.month_usd) {
    await bus.publish('cost:budget-exceeded', {
      service: 'brain',
      window: 'month',
      spent_usd: spentMonth,
      limit_usd: budget.month_usd,
    });
  }
});
```

When the immune system publishes a cost alert, the brain can listen on `cost:*` and self-throttle (drop to a cheaper model, skip reflection on low-priority topics). Closed loop, no human in the middle.

## Credential hygiene watcher

Runs on a timer. Scans the event log for patterns that look like leaked secrets — JWT prefixes, bearer tokens, API keys with common prefixes — and publishes `security:alert` if it finds anything.

This is your last line of defense against an organ accidentally publishing a payload that shouldn't have left its process.

## Honeypot / unexpected-traffic watcher

Optional. Bind an unused port with a simple listener that publishes `security:alert` on connection. Anything that hits it is by definition malicious (legitimate traffic would never reach an undocumented port).

## What the organism gets

With the immune system running:

- Supervised processes that heal from crashes
- Live `security:alert` / `anomaly:detected` / `cost:budget-exceeded` / `supervisor:failed` topics
- The brain has a reason to publish thoughtful intent instead of reflexive panic (the immune system already responded; the brain writes the narrative)
- A human-readable audit trail in the event log

## A note on containment

When an intrusion is detected, what should happen *automatically* vs what needs human approval?

Safe defaults:
- **Engage locks** — safe, reversible
- **Turn on lights** — safe
- **Notify phone** — safe
- **Rotate API credentials** — safe-ish if done via a tested rotation script
- **Revoke a user session** — escalate to human
- **Wipe a device** — escalate to human
- **Reach out to anyone** — escalate to human

Be paranoid about which `security:alert`s are self-resolving. The brain is a suggestion engine, not a command line.

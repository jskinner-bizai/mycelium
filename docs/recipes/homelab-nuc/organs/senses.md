# senses — ingesters from the world beyond devices

Eyes see. Senses sense everything else: the calendar, the body, the air in the room, the weather, the state of external services the organism cares about.

Each sense in this recipe is a tiny Node.js process that polls or subscribes to one data source and publishes to the mycelium bus. 50–200 lines each. Kept separate because they fail independently and are easy to swap.

## The three senses this recipe ships

### Calendar sync

A poller against your calendar provider (Google Calendar, iCal feed, Microsoft 365, whatever). Publishes `calendar:tick` twice a day — a morning tick with the day's schedule, an evening tick with tomorrow's preview.

Sketch:

```ts
import { Bus, MqttAdapter } from '@mycelium/core';

const bus = /* ... */;

async function fetchTodaysEvents(): Promise<Array<{ title: string; starts_at: string; ends_at: string; source: string }>> {
  // talk to your calendar provider. Return an array.
  // Sanitize — if you don't want the brain to see private events, drop them here.
  return [];
}

export async function runCalendarSync() {
  for (;;) {
    try {
      const events = await fetchTodaysEvents();
      for (const event of events) {
        await bus.publish('calendar:tick', { event });
      }
    } catch (err) {
      console.error('[calendar-sync]', err);
    }
    await new Promise((r) => setTimeout(r, 6 * 60 * 60 * 1000)); // every 6 hours
  }
}
```

Run it under the supervisor. The brain subscribes to `calendar:tick` and uses it for the morning briefing.

### Health ingester

If you track biometrics (heart rate, sleep, training load, whatever) in a platform like Apple Health / Google Fit / Garmin / Oura, an ingester pulls recent samples and publishes them to `health:sample`.

```ts
export async function runHealthIngester() {
  for (;;) {
    try {
      const samples = await pullRecentSamples(); // platform-specific
      for (const s of samples) {
        await bus.publish('health:sample', {
          metric: s.metric,         // e.g. 'heart_rate', 'steps', 'sleep_hours'
          value: s.value,
          unit: s.unit,
          ts: s.ts,
        });
      }
    } catch (err) {
      console.error('[health-ingester]', err);
    }
    await new Promise((r) => setTimeout(r, 10 * 60 * 1000)); // every 10 min
  }
}
```

Two privacy knobs to think about:

1. **What does the brain see?** If the brain subscribes to `health:sample`, it has your biometrics in context. Decide deliberately.
2. **Where does it live?** Health data going through a third-party LLM is a disclosure. Consider running the brain locally ([`brain.md`](brain.md) Lane A) if this sense is enabled.

### Ambient sensors

If you have temperature/humidity/CO₂/VOC sensors scattered around the house (ESPHome, Zigbee via HA, or whatever), publish their readings to `ambient:reading`. HA's MQTT Statestream already emits these — you just need the translator organ to reshape them:

```ts
bus.on('ha/state/sensor/<room>_temperature', async (raw) => {
  const value = parseFloat(raw as string);
  if (Number.isNaN(value)) return;
  await bus.publish('ambient:reading', { room: '<room>', temperature: value });
});
```

Low-cadence, low-privacy, high-utility. The brain uses these to ground reasoning ("it's 78° in the office; suggest lowering the thermostat before the meeting").

## Other senses you might add later

- **Weather** — a cheap poll against a weather API. Publishes `weather:current`.
- **Network health** — ping/speedtest results. Publishes `network:status`.
- **Mail / notifications** — webhook-style, receives pushes from external services, re-publishes as `mail:received` / `service:alert`.
- **Time** — yes, a sense for time. `time:hour` every hour, for rituals like "at 8 AM, publish the morning briefing".

## Design notes

**One source per ingester.** Don't stuff calendar + email + tasks into one "organizer" organ. Split by source. Easier to debug, easier to replace.

**Sanitize on the way out.** The ingester owns the decision about what fields leave your data source. Drop anything the rest of the organism doesn't need.

**Retries + backoff.** Every ingester should wrap its polling in a try/catch and log to the console. The `Supervisor` will restart it if it throws, but a noisy fail-fast loop is worse than graceful degradation.

**Polling interval.** Match the data source's natural cadence. Calendars update slowly; biometrics update in minutes; ambient sensors update in seconds. Don't hammer APIs.

## What the organism gets

With these three senses running:

- `calendar:tick` — the organism knows what your day looks like
- `health:sample` — the organism sees your body state
- `ambient:reading` — the organism feels the room

Combined with eyes (vision) and autonomic (device state), the organism now has a genuinely multi-modal model of reality — enough for the brain to write briefings, the immune system to detect anomalies, and the skin to render a single coherent story of *today*.

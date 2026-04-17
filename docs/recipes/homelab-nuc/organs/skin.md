# skin — observable state, daily briefing, kiosk

Skin is where the organism surfaces itself to humans. A dashboard on a screen somewhere. A daily briefing in your inbox or on your phone. A kiosk in the kitchen that rotates through pages of system state. No reflexes live here; it's pure subscription + rendering.

## Role

- Subscribe to the topics humans care about (`motion:*`, `vision:*`, `presence:*`, `health:sample`, `brain:briefing`, `security:alert`, etc.).
- Render them in a form a human can glance at.
- Never publish reflex topics. Skin observes; it doesn't decide.

## The kiosk dashboard

A small Node.js + HTML process. Subscribes to the bus over MQTT; pushes updates to the browser via Server-Sent Events or a WebSocket; renders rotating pages.

Minimal sketch:

```ts
import { Bus, MqttAdapter } from '@mycelium/core';
import express from 'express';

const app = express();
const bus = new Bus({ adapter: new MqttAdapter({ url: `mqtt://<mqtt-broker>:1883` }) });
await bus.connect();

const state: Record<string, unknown> = {};
const subscribers: Array<(snapshot: Record<string, unknown>) => void> = [];

const topics = [
  'motion:detected', 'vision:face-recognized', 'vision:plate-recognized',
  'presence:arrived', 'presence:left', 'calendar:tick',
  'security:alert', 'cost:budget-exceeded', 'supervisor:failed',
  'brain:briefing', 'ambient:reading',
];

for (const topic of topics) {
  bus.on(topic, (payload) => {
    state[topic] = { ts: Date.now(), payload };
    for (const s of subscribers) s(state);
  });
}

app.get('/sse', (_req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const push = (snap: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(snap)}\n\n`);
  };
  subscribers.push(push);
  push(state);
  req.on('close', () => {
    const i = subscribers.indexOf(push);
    if (i >= 0) subscribers.splice(i, 1);
  });
});

app.get('/', (_req, res) => res.sendFile(/* your dashboard html */));
app.listen(80);
```

Point a screen (a spare tablet, a Raspberry Pi, a cheap Mini PC) at `http://<host>/` and leave it on fullscreen. Rotate through pages for different aspects of the organism's state.

Typical pages:

1. **Overview** — system health + temperatures + recent activity + who's home
2. **Cameras / Home Security** — live grid from Frigate snapshots, motion indicators, door sensor states
3. **Home Automation** — lights, locks, climate, scenes
4. **Daily Briefing** — the latest `brain:briefing`, today's calendar, health summary
5. **Immune System** — recent alerts, supervisor events, cost dashboard, network status
6. **Mesh health** — which organs are alive, which are degraded, last-heard timestamps

Don't cram everything onto one page. Rotation is a feature — it forces the viewer to glance at each category instead of drowning in one.

## The daily briefing

Once a day (typically early morning), the brain produces a `brain:briefing` event: a one-paragraph summary of the last 24 hours plus a preview of the day ahead.

Wiring (lives in the brain process, not the skin):

```ts
import { attachBrain } from '@mycelium/brain';

// Fire a briefing at 08:00 local every day
const scheduleBriefing = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  setTimeout(async () => {
    const context = [
      ...bus.replay('calendar:tick'),
      ...bus.replay('health:sample'),
      ...bus.replay('security:alert'),
      ...bus.replay('vision:visitor'),
    ].slice(-100);
    const summary = await brain.ask?.(
      `Summarize the last 24 hours of this organism's activity and preview today. Context: ${JSON.stringify(context)}`
    );
    if (summary) {
      await bus.publish('brain:briefing', {
        window_hours: 24,
        summary,
        highlights: [/* could be extracted structured */],
      });
    }
    scheduleBriefing();
  }, next.getTime() - now.getTime());
};
scheduleBriefing();
```

The skin subscribes to `brain:briefing` and renders it. A notifier organ (phone push, email) also subscribes and pushes it.

## What the organism gets

With the skin running:

- A calm, glanceable picture of system state
- A narrative summary once a day
- Human awareness that closes the loop back to the organism: you see a `security:alert`, you trust (or override) the immune system, and the organism learns from your response

Skin is optional — the organism functions without it. But for a system you're going to live with, a good skin is the difference between "it works" and "I notice when it works."

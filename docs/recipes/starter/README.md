# starter recipe — minimum viable organism, no hardware required

The smallest possible mycelium that actually does something. One process, two "organs", one reflex. No MQTT broker, no cameras, no home automation. You can run it in any directory with Node 20+.

## What it does

- A **sense** organ publishes fake `motion:detected` events every 3 seconds.
- A **reflex** organ subscribes to those events and publishes `light:turn-on`.
- A **dashboard** organ subscribes to both topics and prints them, so you can see the organism respond.
- A **supervisor** keeps all three organs alive; if one throws, it restarts with exponential backoff.

Every `publish` lands in a local SQLite event log at `./events.db`, so you can replay history with `Bus.replay('motion:detected')`.

## Run it

```bash
# from a fresh directory
mkdir mycelium-starter && cd mycelium-starter
npm init -y
npm install @mycelium/core tsx

# copy example.ts from this recipe folder
curl -O https://raw.githubusercontent.com/jskinner-bizai/mycelium/main/docs/recipes/starter/example.ts

npx tsx example.ts
```

You'll see something like:

```
[supervisor] started sense
[supervisor] started reflex
[supervisor] started dashboard
[dashboard] motion:detected   { room: 'kitchen', ts: 1776441601234 }
[dashboard] light:turn-on     { room: 'kitchen' }
[dashboard] motion:detected   { room: 'hallway', ts: 1776441604237 }
[dashboard] light:turn-on     { room: 'hallway' }
...
```

Press `Ctrl+C` to stop.

## What you just saw

- Three independent **organs** — a sense, a reflex, a dashboard — all communicating **only** through the bus.
- A **single shared substrate** — if you added a fourth organ right now, it'd see all four topics without knowing anything about the other three.
- A **self-healing process supervisor** — throw an error in any organ's `run` function and watch it restart.

That's the whole pattern. Real recipes just swap `NoopAdapter` for `MqttAdapter`, add more organs, and wire in actual hardware.

## Go further

- Swap `NoopAdapter` for `MqttAdapter` and point it at a real broker (Mosquitto is 2 MB).
- Add an organ that calls an LLM when motion happens.
- Publish events from a real camera's RTSP stream via `HttpAdapter` webhooks.

See [`../../architecture.md`](../../architecture.md) for the organ map.

# homelab-nuc recipe — a single-host organism

A mycelium organism built on a single mid-range x86 machine running a Type-1 hypervisor. One host; one IP surface; six organs. This recipe is what you get when you commit to running the whole substrate locally, on hardware you own.

## Hardware you'll need

| Component | Minimum | Notes |
|---|---|---|
| CPU | 4 cores, x86_64 | Intel with integrated graphics gives you a free vision AI accelerator |
| RAM | 16 GB | 32+ GB if you want room to add organs later |
| Storage | 1 TB SSD | Event log + vision recordings grow fast |
| Network | wired gigabit | IP cameras will saturate wifi |
| Optional | discrete GPU | Lets you run a local brain (Ollama, LocalAI, etc.) |

Any of the commonly-available small-form-factor machines work: an Intel NUC, a Beelink mini-PC, a used enterprise tiny desktop, a Raspberry Pi 5 with a USB3 SSD (for a reduced-scope version).

## What you'll end up with

Seven processes running on one host, all talking through one MQTT broker:

- **Spinal cord** — a Mosquitto broker, the bus every other organ shares.
- **Brain** — your choice of LLM. Referenced via `@mycelium/brain`. Kept in its own lane so you can swap providers without touching anything else.
- **Autonomic NS** — Home Assistant (HAOS), running as a VM.
- **Eyes** — Frigate, running as a container with hardware-accelerated detection on the iGPU.
- **Senses** — a small set of ingesters (calendar, health, ambient sensors). Each is a `SupervisedTask`.
- **Immune system** — a supervisor + anomaly watchers + a cost budget monitor. Publishes `security:alert` when things look off.
- **Skin** — a kiosk dashboard that subscribes to the bus and renders the organism's current state. Optional: a daily briefing at 8 AM summarizing the last 24 hours.

Topology diagram: [`diagram.svg`](diagram.svg). Topic catalog: [`topics.md`](topics.md). Per-organ setup notes under [`organs/`](organs/).

## What's not in scope for this recipe

- **Multi-host resilience.** If this box dies, so does your organism. That's a Phase D problem.
- **External reachability.** Everything is LAN-only. Remote access is a separate concern (Tailscale, Cloudflare Tunnel, Wireguard — pick one).
- **Specific brand choices.** This recipe points at the *role* each organ plays, not specific models or firmware. Swap freely.

## Install order

Bottom up — the substrate first, then the organs that publish into it, then the ones that consume.

1. **Host OS + hypervisor** — install Proxmox VE (or equivalent) on your machine.
2. **MQTT broker** — spin up a small container running Mosquitto with password auth. See [`organs/autonomic.md`](organs/autonomic.md) for the recommended config. This is the spinal cord; every other organ connects to it.
3. **Autonomic NS** — deploy Home Assistant OS as a VM. Configure the MQTT integration against your broker. Add device integrations for the hardware you actually have.
4. **Eyes** — deploy Frigate as an unprivileged container with iGPU passthrough. Configure cameras, enable face and plate recognition if you want them. Frigate publishes directly to MQTT; you get its topics for free.
5. **Immune system** — deploy a small Node.js service running `@mycelium/core`'s `Supervisor`, plus any anomaly watchers you want. See [`organs/immune.md`](organs/immune.md).
6. **Senses** — deploy your ingesters (calendar sync, health, ambient). Each is a small standalone Node.js service, or a cron-triggered script that publishes to the bus.
7. **Brain** — run `@mycelium/brain`'s `SimpleBrain` as another supervised service. Wire it to the topics it should react to. See [`organs/brain.md`](organs/brain.md).
8. **Skin** — deploy the dashboard last. It just subscribes; it doesn't publish reflexes. See [`organs/skin.md`](organs/skin.md).

You don't have to do all of this at once. The minimum-viable version is **broker + supervisor + one ingester** — from there, every new organ is additive.

## Topology abstractions

Throughout the per-organ docs, you'll see placeholders like `<host-ip>`, `<mqtt-broker>`, `${HA_TOKEN}`. Swap them in as you deploy. The files in this recipe do not assume any particular IP range, hostname, or secret — if you see something that looks like a real value in a future edit, that's a bug and a leak; please open an issue.

Read on:

- [`organs/brain.md`](organs/brain.md) — reasoning organ setup + privacy considerations
- [`organs/eyes.md`](organs/eyes.md) — Frigate + camera choices + MQTT wiring
- [`organs/autonomic.md`](organs/autonomic.md) — Home Assistant + MQTT + device integrations
- [`organs/immune.md`](organs/immune.md) — supervisor, anomaly watchers, cost budgets
- [`organs/senses.md`](organs/senses.md) — calendar, health, ambient ingesters
- [`organs/skin.md`](organs/skin.md) — dashboard + daily briefing
- [`topics.md`](topics.md) — full topic catalog for this recipe

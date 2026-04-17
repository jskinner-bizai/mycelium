# Philosophy

## From stacks to organisms

A "productivity stack" is a diagram with arrows. Gmail → Notion → Calendar → Slack → Linear. Arrows imply direction; they encode intent about which way information flows and which tool is the source of truth. In practice, information flows every which way, source-of-truth is negotiable, and the arrows are wrong by Tuesday.

An organism doesn't have arrows. It has a bloodstream. Every organ is connected to every other by the same substrate; priorities emerge from biology, not from a diagram.

mycelium rejects the stack metaphor. The substrate is the primary object — we call it the bus, or the spinal cord, or the mycelial network. Services are organs that publish sensations and subscribe to reflexes. Agents are muscles that move in response. Memory is everywhere.

## Why this matters

Three things change when you drop the stack and adopt the organism.

**Context is free.** When the front-door camera fires, it publishes `motion:detected` to the bus. The language model subscribes. So does the lights subsystem. So does the notification channel. None of them had to be wired into a bespoke integration — they all heard the same event at the same time. Context isn't something you plumb; it's something you're surrounded by.

**Failure is local.** If the language model is down, the lights still turn on. The notification still fires. The camera still records. The organism degrades in ways you can see and reason about, instead of collapsing in ways you can't.

**Extension is cheap.** Adding a new adapter is adding a new limb. You don't have to refactor the stack; you don't have to argue about which service owns the integration. You subscribe to the events you care about, you publish the events you produce, and you're part of the organism.

## The four promises, in depth

### Bi-directional

Every sense is a possible reflex trigger, and every actuation is observable. The bus is symmetric. This is the opposite of the "sensor platform → cloud API → dashboard" pattern, where data flows out and commands flow back through a narrow gate.

### Self-defending

A watchdog agent subscribes to `security:*`, `anomaly:*`, `auth:failed`. When something alarming lands, it investigates using the brain (language-model reasoning over recent events), then publishes a response — `lock:engage`, `credential:rotate`, `process:quarantine`, `human:page`. Humans opt into the loop; the default is act.

### Self-healing

Every long-running service registers with the Supervisor. Crashes restart with backoff. Cloud-dependent hops queue locally when the cloud is down. The event log (`Bus.replay()`) lets services replay what they missed.

### Self-improving

The brain has write access to the codebase. When it proposes an extension — a new adapter, a new reflex — it opens a pull request. A policy gate or a human approves. CI runs. If green, the change merges and redeploys. The organism grew.

This is the most radical of the four and the one most worth getting right.

## What this isn't

**It isn't magic.** The bus is boring — publish/subscribe over MQTT, with a SQLite log. The novelty is in what you put on top.

**It isn't generic.** mycelium is an opinion, not a framework. If you want unopinionated event-driven middleware, there are better tools. mycelium is for people who want the organism metaphor all the way down.

**It isn't Ready for Everyone™.** You bring the hardware, the brand choices, the personal threat model, the intelligence service. mycelium gives you the substrate and the pattern.

## On reading this project

`packages/mesh-core/` is code. `docs/` is argument. Read both. If you only read the code you won't know why it looks like this. If you only read the docs you won't know what it actually does.

The animated diagram at `docs/diagrams/organism.html` is the picture the rest of the documentation is drawing.

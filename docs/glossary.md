# Glossary

Terms with deliberate flavor, so they don't drift into generic middleware words.

| Term | Meaning |
|---|---|
| **organism** | the running mycelium deployment as a whole |
| **organ** | a service that participates in the bus (camera pipeline, brain, light controller, ...) |
| **substrate** | the event bus — the thing every organ shares |
| **spinal cord** | the `Bus` instance |
| **sense** | an inbound event from the world (motion, heart rate, calendar tick) |
| **reflex** | an automated response to a sense, without brain involvement |
| **brain** | the intelligence service — LLM-backed, intent-forming, memory-holding |
| **limb** | an external-tool adapter (email, notes, calendar, code) |
| **immune response** | a security reflex: detect, investigate, respond |
| **spore** | a deployable unit — usually a recipe folder under `docs/recipes/` |
| **mycorrhiza** | cross-organism connection (two mycelium deployments federated) — not implemented yet |

When writing docs, prefer these terms over generic ones. *spinal cord* beats *message bus*; *organ* beats *microservice*; *sense* and *reflex* beat *event* and *handler*.

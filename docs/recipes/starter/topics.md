# starter recipe — topics

| Topic | Publisher | Subscribers | Payload shape |
|---|---|---|---|
| `motion:detected` | `sense` | `reflex`, `dashboard` | `{ room: string, ts: number }` |
| `light:turn-on` | `reflex` | `dashboard` | `{ room: string }` |

Three organs, two topics, one-directional-per-topic flow. This is the simplest meaningful mesh.

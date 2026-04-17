# homelab-nuc — topic catalog

Every topic the organism uses in this recipe. Publishers and subscribers are *roles*, not specific processes — multiple processes can share a role.

## Senses — inbound from the world

| Topic | Publisher | Subscribers | Payload shape |
|---|---|---|---|
| `motion:detected` | eyes (camera) | brain, autonomic, skin, immune | `{ camera: string, zone?: string, ts: number }` |
| `motion:cleared` | eyes | skin | `{ camera: string, ts: number }` |
| `vision:person` | eyes | brain, autonomic, immune | `{ camera: string, person?: string, confidence: number }` |
| `vision:face-recognized` | eyes | brain, autonomic | `{ camera: string, person: string, confidence: number }` |
| `vision:plate-recognized` | eyes | brain, immune | `{ camera: string, plate: string, known: boolean }` |
| `vision:package` | eyes | brain, skin | `{ camera: string, ts: number }` |
| `vision:visitor` | eyes (doorbell) | brain, autonomic, skin | `{ ts: number }` |
| `presence:arrived` | senses (home-assistant) | brain, autonomic, skin | `{ who: string }` |
| `presence:left` | senses | brain, autonomic | `{ who: string }` |
| `calendar:tick` | senses (calendar sync) | brain, skin | `{ event: { title: string, starts_at: string, ends_at: string, source: string } }` |
| `health:sample` | senses (health ingester) | brain, skin | `{ metric: string, value: number, unit: string, ts: number }` |
| `ambient:reading` | senses (sensors) | brain, autonomic, skin | `{ room: string, temperature?: number, humidity?: number, air_quality?: number }` |

## Reflexes — outbound actuation

| Topic | Publisher | Subscribers | Payload shape |
|---|---|---|---|
| `light:turn-on` | brain, autonomic | device controllers | `{ room?: string, entity?: string, brightness?: number }` |
| `light:turn-off` | brain, autonomic | device controllers | `{ room?: string, entity?: string }` |
| `lock:engage` | brain, immune | device controllers | `{ door: string }` |
| `lock:disengage` | brain, autonomic | device controllers | `{ door: string, reason: string }` |
| `scene:apply` | brain, autonomic | device controllers | `{ scene: string }` |
| `notify:phone` | brain, immune, skin | notifier | `{ title: string, body: string, priority?: 'normal' \| 'time-sensitive' \| 'critical' }` |

## Brain — reasoning output

| Topic | Publisher | Subscribers | Payload shape |
|---|---|---|---|
| `brain:intent` | brain | skin, immune (audit) | `{ topic: string, payload: unknown, rationale: string }` |
| `brain:reflection` | brain | skin (memory log) | `{ note: string, refs?: Array<{ topic: string, ts: number }> }` |
| `brain:briefing` | brain (daily) | skin, notifier | `{ window_hours: number, summary: string, highlights: string[] }` |

## Immune system — defense

| Topic | Publisher | Subscribers | Payload shape |
|---|---|---|---|
| `security:alert` | immune | brain, autonomic, skin, notifier | `{ kind: 'intrusion' \| 'anomaly' \| 'policy-violation', details: string, evidence?: unknown }` |
| `security:resolved` | immune | skin | `{ alert_id: string, resolution: string }` |
| `anomaly:detected` | immune watchers | brain, skin | `{ source: string, metric: string, value: number, expected: string }` |
| `cost:budget-exceeded` | immune (cost watcher) | brain, skin, notifier | `{ service: string, window: 'day' \| 'month', spent_usd: number, limit_usd: number }` |
| `supervisor:failed` | immune (process supervisor) | brain, skin | `{ name: string, error: string, attempt: number }` |
| `supervisor:restarted` | immune | skin | `{ name: string, delay_ms: number, attempt: number }` |

## Skin — observability only (subscribes; rarely publishes)

| Topic | Publisher | Subscribers | Payload shape |
|---|---|---|---|
| `skin:view-changed` | skin (kiosk) | — | `{ page: string }` (optional, for multi-page kiosks) |

## Topic hygiene

- Lower-kebab, colon-separated. Two segments: `domain:action` or `domain:state`.
- Payloads are JSON. Keep them small (under ~2 KB). If you need to pass a blob, upload it separately and publish a URL.
- Include a `ts` field in anything time-relevant. Millisecond epoch, UTC.
- Names are nouns-and-verbs, not sentences. `motion:detected`, not `a-motion-has-been-detected`.
- Don't reuse a topic for two meanings. If you need a variant, extend with a suffix: `motion:detected:high-confidence`.

## Extending

Add a new organ? Add a row here. Rename a topic? Deprecate the old one gracefully — publish on both for a week, then drop. The bus is a contract; treat it like one.

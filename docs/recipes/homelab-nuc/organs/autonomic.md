# autonomic nervous system — device reflexes

Home Assistant is the autonomic NS in this recipe. It owns the *fast* reflexes — the ones that can't wait for the brain. When motion fires, the light should turn on in milliseconds, regardless of whether the LLM is warm. That's autonomic, not cognitive.

## Role

- Hold the current state of every device in the house (lights, locks, sensors, media, HVAC).
- Expose that state over MQTT (via HA's MQTT integration) so every mycelium organ sees a single canonical reality.
- Execute reflex automations in under 200 ms.
- Be the failsafe: if the brain is down, if the immune system is paused, devices still respond to people pressing buttons.

## Deploy

- Install **Home Assistant OS** as a VM on the hypervisor (KVM/QEMU under Proxmox, Hyper-V under Windows Server, VMware, whatever you use). 4 CPU / 8 GB RAM is ample for a house with 50+ devices.
- HAOS is opinionated and self-contained. It ships add-ons, the Supervisor, snapshot/restore, OTA updates.
- Assign it a static DHCP reservation — you want `<ha-host>` stable so MQTT clients and mycelium organs can always find it.

## MQTT broker + HA

Your Mosquitto broker is the spinal cord. HA connects to it via the MQTT integration:

1. HA Settings → Devices & Services → Add Integration → MQTT
2. Broker: `<mqtt-broker>`, port 1883
3. Username / password: a dedicated HA account on the broker (`homeassistant` or similar — never share the broker creds across organs)

Now every HA entity can publish state to MQTT automatically via MQTT Discovery, and HA can subscribe to mycelium topics as automation triggers.

## Wiring mycelium topics → HA reflexes

Two directions:

**mycelium → HA**: the brain, the immune system, or the eyes publish an intent; HA acts on it.

Create an HA automation:

```yaml
- alias: "Reflex: light:turn-on"
  trigger:
    - platform: mqtt
      topic: light:turn-on
  action:
    - service: light.turn_on
      target:
        entity_id: "{{ ('light.' ~ trigger.payload_json.room) | replace(' ', '_') }}"
```

**HA → mycelium**: HA publishes device state changes so the rest of the organism sees them.

Easier way: configure the MQTT Statestream integration in HA to publish every entity state change to MQTT under a prefix like `ha/state/<entity_id>`. A tiny translator organ re-shapes those into mycelium topics (`light:state`, `lock:state`, `presence:arrived`, etc.) — exactly the pattern used for Frigate in [`eyes.md`](eyes.md).

## Reflexes vs intents

A reflex is something you want to happen immediately, every time, deterministically. An intent is something the brain proposes and the autonomic NS acts on (or rejects).

Examples of autonomic reflexes (fire instantly):

- Motion in an empty room → turn on the light
- Door opens → send `presence:arrived`
- Doorbell → flash a notification to the phone
- Smoke detector → unlock front door + turn off HVAC

Examples of brain-mediated intents (autonomic executes only when ordered):

- "Known visitor at 9 PM → unlock front door" (brain decides based on identity + schedule)
- "Car that doesn't belong arrives → lock everything" (brain decides based on plate + known list)
- "It's been quiet for 2 hours during the day → lower the thermostat by 2°" (brain decides based on context)

Put the first kind in HA automations. Put the second kind in the brain, and let HA act on `brain:intent` as if it were any other topic.

## Presence, calendar, scheduling

HA has good built-in primitives for each. Make them publish to the mycelium bus so the organism hears:

- Device trackers / person integration → `presence:arrived` / `presence:left`
- Calendar integration → `calendar:tick` (daily, via a time-triggered automation)
- Alarm panel → `security:resolved` when disarmed, `security:alert` when tripped

## What the organism gets

With HA in place and wired:

- A canonical device state surface
- Sub-second reflexes for time-critical actions
- `presence:*`, `light:*`, `lock:*`, `scene:*`, `ambient:*` on the bus
- A failsafe when the brain is cold

HA is the single biggest dependency in this recipe. If you already have it set up, you're most of the way to a working organism.

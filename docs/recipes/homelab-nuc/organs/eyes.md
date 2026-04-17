# eyes — vision AI

Frigate does the heavy lifting: real-time person / vehicle / face / plate detection against RTSP camera feeds, all local, all MQTT-native. By the time Frigate boots, the organism has eyes.

## Why Frigate

- Publishes to MQTT natively on topics that map cleanly to mycelium conventions (`frigate/<cam>/person`, `frigate/events`, etc.).
- Uses the iGPU for detection via OpenVINO — so the host CPU is free.
- Ships face recognition and license-plate OCR in the same image.
- Stores recordings and snapshots locally; you can point at them from `brain:intent` when needed.

## Hardware

- **Cameras** — any ONVIF or RTSP-capable IP camera works. Wired is strongly preferred; PoE doubly so. If you have a battery-powered line (doorbells, outdoor cams on a wireless protocol), you'll likely need a brand-specific hub to bridge them to RTSP — see your camera vendor's docs.
- **Accelerator** — for a 7th-gen-or-later Intel, the iGPU is enough for 6–8 cameras at 5 FPS detection. Otherwise a Coral USB Edge TPU is ~$60 and plug-and-play.

## Deploy

Frigate ships as a Docker image. Run it in a container on the same host as the broker (or any machine on the LAN — MQTT is the only dependency).

Minimal `docker-compose.yml` sketch (all variables are placeholders you fill in):

```yaml
services:
  frigate:
    image: ghcr.io/blakeblackshear/frigate:stable
    restart: unless-stopped
    privileged: true
    shm_size: 256mb
    network_mode: host
    devices:
      - /dev/dri/renderD128
    volumes:
      - ./config:/config
      - ./media:/media/frigate
      - /etc/localtime:/etc/localtime:ro
```

Frigate's `config.yml` (sketch):

```yaml
mqtt:
  enabled: true
  host: <mqtt-broker>
  port: 1883
  user: ${FRIGATE_MQTT_USER}
  password: ${FRIGATE_MQTT_PASSWORD}
  topic_prefix: frigate
  client_id: frigate

detectors:
  ov:
    type: openvino
    device: GPU

face_recognition:
  enabled: true

lpr:
  enabled: true

cameras:
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://<camera-user>:<camera-pw>@<cam-ip>:554/h264Preview_01_sub
          roles: [detect]
        - path: rtsp://<camera-user>:<camera-pw>@<cam-ip>:554/h264Preview_01_main
          roles: [record]
    detect:
      enabled: true
    objects:
      track: [person, car, dog, cat]
```

Never commit `config.yml` with real credentials. Template them from environment or a local sealed secrets file.

## Wiring Frigate events to the mycelium bus

Frigate publishes to `frigate/*` topics. You want them re-shaped to the mycelium conventions documented in [`../topics.md`](../topics.md). The cleanest way is a small **translator organ** — a process subscribed to `frigate/events` that reshapes events and re-publishes under `vision:*` / `motion:*`:

```ts
import { Bus, MqttAdapter } from '@mycelium/core';

const bus = new Bus({
  adapter: new MqttAdapter({
    url: `mqtt://<mqtt-broker>:1883`,
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASSWORD,
  }),
});
await bus.connect();

bus.on('frigate/events', async (rawPayload) => {
  const evt = rawPayload as { type: string; after: { camera: string; label: string; sub_label?: string } };
  if (evt.type !== 'new' && evt.type !== 'update') return;
  const { camera, label, sub_label } = evt.after;

  if (label === 'person' && sub_label) {
    await bus.publish('vision:face-recognized', { camera, person: sub_label, confidence: 1 });
  } else if (label === 'person') {
    await bus.publish('vision:person', { camera, confidence: 1 });
  } else if (label === 'car') {
    await bus.publish('vision:plate-recognized', { camera, plate: sub_label ?? '', known: false });
  }
});
```

Run this translator as another `SupervisedTask`. Now the rest of the organism sees well-named `vision:*` events and never has to know Frigate exists.

## Faces and plates

Both features require a small training step inside Frigate:

- **Faces** — upload 5–100 clear photos per person under Frigate's UI. Use diverse angles and lighting. The face embedding is local.
- **Plates** — configure known plates in `lpr.known_plates` with friendly names. OCR runs on-device.

If you want the brain to decide what to *do* when a known face arrives, subscribe to `vision:face-recognized` from the brain (see [`brain.md`](brain.md)) and let it publish `brain:intent` that the autonomic NS acts on.

## Storage

Frigate keeps recordings and snapshots on disk. Expect ~2–5 GB / day / camera at typical settings. SSDs handle this fine for months; for years of retention move to an HDD volume for `/media/frigate` and keep the config+detector DB on SSD.

## What the organism gets

Once Frigate + the translator are live, the bus carries:

- `motion:detected` / `motion:cleared`
- `vision:person`
- `vision:face-recognized` (labeled)
- `vision:plate-recognized` (labeled if known)
- `vision:package`
- `vision:visitor` (doorbell button press)

The brain can reason on all of them. The autonomic NS can reflex on the subset you care about. The skin renders a live feed. The immune system watches for `vision:person` at 3 AM when the house is supposed to be empty.

One install, seven new senses wired into the mesh.

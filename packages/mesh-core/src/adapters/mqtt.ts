import mqtt, { type MqttClient } from 'mqtt';
import type { Adapter, Handler } from '../adapter.js';

export interface MqttAdapterOptions {
  url: string;
  username?: string;
  password?: string;
  clientId?: string;
}

export class MqttAdapter implements Adapter {
  private client: MqttClient | null = null;
  private handlers = new Map<string, Handler[]>();
  private opts: MqttAdapterOptions;

  constructor(opts: MqttAdapterOptions) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(this.opts.url, {
        username: this.opts.username,
        password: this.opts.password,
        clientId: this.opts.clientId,
        reconnectPeriod: 1000,
      });
      this.client.on('connect', () => resolve());
      this.client.on('error', reject);
      this.client.on('message', (topic, buf) => {
        const list = this.handlers.get(topic);
        if (!list) return;
        let payload: unknown;
        try {
          payload = JSON.parse(buf.toString());
        } catch {
          payload = buf.toString();
        }
        for (const h of list) Promise.resolve(h(payload));
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    await new Promise<void>((resolve) => this.client?.end(false, {}, () => resolve()));
    this.client = null;
    this.handlers.clear();
  }

  subscribe(topic: string, handler: Handler): void {
    if (!this.client) throw new Error('MqttAdapter: subscribe before connect');
    const list = this.handlers.get(topic) ?? [];
    list.push(handler);
    this.handlers.set(topic, list);
    this.client.subscribe(topic);
  }

  async publish(topic: string, payload: unknown): Promise<void> {
    if (!this.client) throw new Error('MqttAdapter: publish before connect');
    return new Promise((resolve, reject) => {
      this.client?.publish(topic, JSON.stringify(payload), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

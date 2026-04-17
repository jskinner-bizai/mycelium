import type { Adapter, Handler } from '../adapter.js';

export class NoopAdapter implements Adapter {
  private handlers = new Map<string, Handler[]>();
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers.clear();
  }

  subscribe(topic: string, handler: Handler): void {
    const list = this.handlers.get(topic) ?? [];
    list.push(handler);
    this.handlers.set(topic, list);
  }

  async publish(topic: string, payload: unknown): Promise<void> {
    const list = this.handlers.get(topic);
    if (!list) return;
    await Promise.all(list.map((h) => Promise.resolve(h(payload))));
  }
}

import type { Adapter, Handler } from './adapter.js';

export interface BusOptions {
  adapter: Adapter;
  /** Optional SQLite path for event log persistence. If omitted, events are not logged. */
  logPath?: string;
}

export class Bus {
  private adapter: Adapter;
  private connected = false;

  constructor(opts: BusOptions) {
    this.adapter = opts.adapter;
  }

  async connect(): Promise<void> {
    await this.adapter.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    await this.adapter.disconnect();
  }

  on(topic: string, handler: Handler): void {
    this.adapter.subscribe(topic, handler);
  }

  async publish(topic: string, payload: unknown): Promise<void> {
    if (!this.connected) throw new Error('Bus is not connected. Call connect() first.');
    await this.adapter.publish(topic, payload);
  }
}

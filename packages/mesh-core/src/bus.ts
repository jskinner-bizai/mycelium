import Database from 'better-sqlite3';
import type { Adapter, Handler } from './adapter.js';

export interface BusOptions {
  adapter: Adapter;
  /** Optional SQLite path for event log persistence. If omitted, events are not logged. */
  logPath?: string;
}

export interface LoggedEvent {
  ts: number;
  topic: string;
  payload: unknown;
}

export class Bus {
  private adapter: Adapter;
  private db: Database.Database | null = null;
  private connected = false;

  constructor(opts: BusOptions) {
    this.adapter = opts.adapter;
    if (opts.logPath) {
      this.db = new Database(opts.logPath);
      this.db.exec(
        'CREATE TABLE IF NOT EXISTS events (ts INTEGER NOT NULL, topic TEXT NOT NULL, payload TEXT NOT NULL)',
      );
      this.db.exec('CREATE INDEX IF NOT EXISTS events_topic_ts ON events(topic, ts)');
    }
  }

  async connect(): Promise<void> {
    await this.adapter.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    await this.adapter.disconnect();
    this.db?.close();
    this.db = null;
  }

  on(topic: string, handler: Handler): void {
    this.adapter.subscribe(topic, handler);
  }

  async publish(topic: string, payload: unknown): Promise<void> {
    if (!this.connected) throw new Error('Bus is not connected. Call connect() first.');
    await this.adapter.publish(topic, payload);
    if (this.db) {
      this.db
        .prepare('INSERT INTO events (ts, topic, payload) VALUES (?, ?, ?)')
        .run(Date.now(), topic, JSON.stringify(payload));
    }
  }

  *replay(topic: string): IterableIterator<LoggedEvent> {
    if (!this.db) return;
    const rows = this.db
      .prepare('SELECT ts, topic, payload FROM events WHERE topic = ? ORDER BY ts ASC')
      .all(topic) as Array<{ ts: number; topic: string; payload: string }>;
    for (const r of rows) {
      yield { ts: r.ts, topic: r.topic, payload: JSON.parse(r.payload) };
    }
  }
}

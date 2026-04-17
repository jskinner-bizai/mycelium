import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Adapter, Handler } from '../adapter.js';

export interface HttpAdapterOptions {
  /** Port the adapter listens on for inbound webhooks. */
  listenPort: number;
  /** Base URL used for outbound publishes (topics become path segments). */
  publishBaseUrl?: string;
}

export class HttpAdapter implements Adapter {
  private server: Server | null = null;
  private handlers = new Map<string, Handler[]>();
  private opts: HttpAdapterOptions;

  constructor(opts: HttpAdapterOptions) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handle(req, res));
      this.server.once('error', reject);
      this.server.listen(this.opts.listenPort, () => resolve());
    });
  }

  async disconnect(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    this.server = null;
    this.handlers.clear();
  }

  subscribe(topic: string, handler: Handler): void {
    const list = this.handlers.get(topic) ?? [];
    list.push(handler);
    this.handlers.set(topic, list);
  }

  async publish(topic: string, payload: unknown): Promise<void> {
    if (!this.opts.publishBaseUrl) return;
    const url = `${this.opts.publishBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(topic)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HttpAdapter publish ${topic} failed: ${res.status}`);
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST' || !req.url) {
      res.writeHead(405).end();
      return;
    }
    const topic = decodeURIComponent(req.url.replace(/^\//, ''));
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks).toString();
    let payload: unknown;
    try {
      payload = body ? JSON.parse(body) : null;
    } catch {
      payload = body;
    }
    const list = this.handlers.get(topic);
    if (list) for (const h of list) Promise.resolve(h(payload));
    res.writeHead(204).end();
  }
}

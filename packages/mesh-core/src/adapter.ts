export type Handler = (payload: unknown) => void | Promise<void>;

export interface Adapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, payload: unknown): Promise<void>;
  subscribe(topic: string, handler: Handler): void;
}

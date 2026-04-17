/**
 * The organism's brain — reasons about events, forms intents.
 *
 * Concrete implementations wrap any LLM-compatible service. mycelium ships
 * `SimpleBrain` as a reference; you can also write one backed by your own
 * private reasoning service (the only constraint is the contract below).
 */
export interface Brain {
  /**
   * React to an event. Returns zero or more intents the organism should act on.
   * An intent is a `{topic, payload}` pair the brain wants published to the bus.
   */
  reflect(event: BrainInput): Promise<Intent[]>;

  /** Optional: store a memory the brain can recall later. */
  remember?(note: string, metadata?: Record<string, unknown>): Promise<void>;

  /** Optional: answer a free-form question outside the event loop. */
  ask?(question: string): Promise<string>;
}

export interface BrainInput {
  topic: string;
  payload: unknown;
  /** Optional context the attach helper may fill in. */
  context?: {
    recent?: Array<{ topic: string; payload: unknown; ts: number }>;
  };
}

export interface Intent {
  topic: string;
  payload: unknown;
  /** Optional natural-language rationale for observability. */
  rationale?: string;
}

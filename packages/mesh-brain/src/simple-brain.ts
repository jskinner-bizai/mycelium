import type { Brain, BrainInput, Intent } from './brain.js';

export interface SimpleBrainOptions {
  /**
   * Thin adapter to your language model. Receives a prompt, returns the
   * model's text response. mycelium does not prescribe a provider — plug
   * in Claude, OpenAI, Ollama, LiteLLM, or a private service.
   */
  complete: (prompt: string) => Promise<string>;

  /** Optional system prompt. A sensible default is used if omitted. */
  systemPrompt?: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are the brain of a mycelium organism — a personal operating system modeled as a biological mesh.
You receive events from the organism's bus and respond with zero or more intents.
An intent is a JSON object: {"topic": string, "payload": any, "rationale"?: string}.
Return a JSON array of intents. Return [] if no action is warranted.
Be conservative: only act when there's a clear reflex or a meaningful signal.
Do not include any text outside the JSON array.`;

export class SimpleBrain implements Brain {
  private complete: (prompt: string) => Promise<string>;
  private systemPrompt: string;

  constructor(opts: SimpleBrainOptions) {
    this.complete = opts.complete;
    this.systemPrompt = opts.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }

  async reflect(event: BrainInput): Promise<Intent[]> {
    const prompt = this.buildPrompt(event);
    const response = await this.complete(prompt);
    return this.parseIntents(response);
  }

  private buildPrompt(event: BrainInput): string {
    const recent = event.context?.recent ?? [];
    const recentStr = recent
      .slice(-10)
      .map((e) => `  ${new Date(e.ts).toISOString()} ${e.topic} ${JSON.stringify(e.payload)}`)
      .join('\n');
    return [
      this.systemPrompt,
      '',
      'Incoming event:',
      `  topic: ${event.topic}`,
      `  payload: ${JSON.stringify(event.payload)}`,
      recent.length > 0 ? `\nRecent context:\n${recentStr}` : '',
      '',
      'Your intents (JSON array):',
    ].join('\n');
  }

  private parseIntents(response: string): Intent[] {
    const trimmed = response.trim();
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    if (start < 0 || end < 0 || end <= start) return [];
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
        .filter((x) => typeof x.topic === 'string')
        .map((x) => ({
          topic: x.topic as string,
          payload: x.payload,
          rationale: typeof x.rationale === 'string' ? x.rationale : undefined,
        }));
    } catch {
      return [];
    }
  }
}

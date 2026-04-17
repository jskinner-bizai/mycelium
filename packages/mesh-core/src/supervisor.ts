export interface BackoffPolicy {
  initialMs: number;
  maxMs: number;
  factor: number;
}

export interface SupervisedTask {
  name: string;
  run: () => Promise<void>;
  backoff?: BackoffPolicy;
}

export type SupervisorEvent =
  | { type: 'started'; name: string; attempt: number }
  | { type: 'failed'; name: string; error: unknown; attempt: number }
  | { type: 'restarted'; name: string; delayMs: number; attempt: number }
  | { type: 'exited'; name: string; attempt: number };

export interface SupervisorOptions {
  notify?: (event: SupervisorEvent) => void;
}

const DEFAULT_BACKOFF: BackoffPolicy = { initialMs: 500, maxMs: 30_000, factor: 2 };

interface TaskState {
  attempts: number;
  timer: NodeJS.Timeout | null;
  stopped: boolean;
}

export class Supervisor {
  private tasks: SupervisedTask[] = [];
  private state = new Map<string, TaskState>();
  private notify: (event: SupervisorEvent) => void;

  constructor(opts: SupervisorOptions = {}) {
    this.notify =
      opts.notify ??
      ((e) => {
        // default sink: stdout
        console.log(`[supervisor] ${e.type} ${e.name}`);
      });
  }

  register(task: SupervisedTask): void {
    this.tasks.push(task);
  }

  async start(): Promise<void> {
    for (const task of this.tasks) {
      this.state.set(task.name, { attempts: 0, timer: null, stopped: false });
      this.spawn(task);
    }
  }

  async stop(): Promise<void> {
    for (const [, s] of this.state) {
      s.stopped = true;
      if (s.timer) clearTimeout(s.timer);
      s.timer = null;
    }
  }

  private spawn(task: SupervisedTask): void {
    const s = this.state.get(task.name);
    if (!s || s.stopped) return;
    s.attempts++;
    const attempt = s.attempts;
    this.notify({ type: 'started', name: task.name, attempt });
    task
      .run()
      .then(() => {
        this.notify({ type: 'exited', name: task.name, attempt });
      })
      .catch((err) => {
        if (s.stopped) return;
        this.notify({ type: 'failed', name: task.name, error: err, attempt });
        const policy = task.backoff ?? DEFAULT_BACKOFF;
        const delay = Math.min(policy.initialMs * policy.factor ** (attempt - 1), policy.maxMs);
        s.timer = setTimeout(() => {
          s.timer = null;
          if (s.stopped) return;
          this.notify({ type: 'restarted', name: task.name, delayMs: delay, attempt: attempt + 1 });
          this.spawn(task);
        }, delay);
      });
  }
}

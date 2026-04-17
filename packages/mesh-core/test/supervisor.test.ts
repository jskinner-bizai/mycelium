import { describe, it, expect } from 'vitest';
import { Supervisor, type SupervisorEvent } from '../src/supervisor.js';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Supervisor', () => {
  it('runs a task once when it exits cleanly', async () => {
    const events: SupervisorEvent[] = [];
    const sup = new Supervisor({ notify: (e) => events.push(e) });
    let runs = 0;
    sup.register({
      name: 'clean',
      run: async () => {
        runs++;
      },
    });
    await sup.start();
    await wait(50);
    await sup.stop();
    expect(runs).toBe(1);
    expect(events.filter((e) => e.type === 'started')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'failed')).toHaveLength(0);
  });

  it('restarts a failing task with exponential backoff', async () => {
    const events: SupervisorEvent[] = [];
    const sup = new Supervisor({ notify: (e) => events.push(e) });
    let calls = 0;
    sup.register({
      name: 'flaky',
      run: async () => {
        calls++;
        if (calls < 3) throw new Error('boom');
      },
      backoff: { initialMs: 5, maxMs: 50, factor: 2 },
    });
    await sup.start();
    await wait(200);
    await sup.stop();
    expect(calls).toBe(3);
    expect(events.filter((e) => e.type === 'failed').length).toBeGreaterThanOrEqual(2);
    expect(events.filter((e) => e.type === 'restarted').length).toBeGreaterThanOrEqual(2);
  });

  it('stops restarting once stop() is called', async () => {
    const events: SupervisorEvent[] = [];
    const sup = new Supervisor({ notify: (e) => events.push(e) });
    let calls = 0;
    sup.register({
      name: 'eternal',
      run: async () => {
        calls++;
        throw new Error('always');
      },
      backoff: { initialMs: 5, maxMs: 50, factor: 2 },
    });
    await sup.start();
    await wait(30);
    await sup.stop();
    const callsAtStop = calls;
    await wait(80);
    expect(calls).toBe(callsAtStop);
  });
});

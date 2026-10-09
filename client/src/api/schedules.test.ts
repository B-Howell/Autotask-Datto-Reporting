import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSchedule, runNow, scheduleLogsUrl } from './schedules';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('schedules api', () => {
  it('points the log stream at the schedules router', () => {
    expect(scheduleLogsUrl()).toBe('/api/schedules/logs');
  });

  it('posts a new schedule as JSON and returns the created row', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 7, preset_id: 3 }, 201));
    vi.stubGlobal('fetch', fetchMock);

    const body = {
      preset_id: 3,
      day_of_month: 1,
      hour: 7,
      recipients_to: ['a@example.com'],
      recipients_cc: [],
      subject: '{report} {period}',
      body: '',
    };
    const created = await createSchedule(body);

    expect(created).toEqual({ id: 7, preset_id: 3 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/schedules');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(body);
  });

  it('surfaces the server detail when a run cannot start', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ detail: 'A run of schedule 2 is already in flight' }, 409)
        )
    );
    await expect(runNow(5)).rejects.toThrow('A run of schedule 2 is already in flight');
  });
});

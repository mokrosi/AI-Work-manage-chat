import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks } from './useTasks';
import type { Task } from '@lib/types';

const api = vi.hoisted(() => ({
  fetchTasks: vi.fn(),
  getUserTimezone: vi.fn(() => 'UTC'),
}));

vi.mock('@lib/api', () => api);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const task: Task = {
  id: 'task-1',
  title: 'Planning',
  description: null,
  startTime: '2026-09-21T09:00:00.000Z',
  endTime: '2026-09-21T10:00:00.000Z',
  status: 'PENDING',
  userId: 'user-1',
  createdAt: '2026-09-20T08:00:00.000Z',
  updatedAt: '2026-09-20T08:30:00.000Z',
};

beforeEach(() => {
  api.fetchTasks.mockReset();
});

describe('useTasks', () => {
  it('fetches tasks for the given scope using the user timezone', async () => {
    api.fetchTasks.mockResolvedValueOnce([task]);

    const scope = {
      from: new Date('2026-09-01T00:00:00.000Z'),
      to: new Date('2026-10-01T00:00:00.000Z'),
    };

    const { result } = renderHook(() => useTasks(scope), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.fetchTasks).toHaveBeenCalledWith({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-10-01T00:00:00.000Z',
      timezone: 'UTC',
    });
    expect(result.current.data).toEqual([task]);
  });

  it('surfaces an error state when the request fails', async () => {
    api.fetchTasks.mockRejectedValueOnce(new Error('boom'));

    const scope = {
      from: new Date('2026-09-01T00:00:00.000Z'),
      to: new Date('2026-10-01T00:00:00.000Z'),
    };

    const { result } = renderHook(() => useTasks(scope), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
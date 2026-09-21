import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchTasks,
  sendChat,
  confirmApproval,
  getUserTimezone,
} from './api';
import type { Task } from './types';

const mocks = vi.hoisted(() => {
  const get = vi.fn();
  const post = vi.fn();
  return {
    get,
    post,
    axios: {
      create: vi.fn(() => ({ get, post })),
    },
  };
});

vi.mock('axios', () => ({
  default: mocks.axios,
}));

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
  mocks.get.mockReset();
  mocks.post.mockReset();
});

describe('fetchTasks', () => {
  it('calls GET /tasks with the scope and timezone', async () => {
    mocks.get.mockResolvedValue({ data: [task] });

    const result = await fetchTasks({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-10-01T00:00:00.000Z',
      timezone: 'UTC',
    });

    expect(mocks.get).toHaveBeenCalledWith('/tasks', {
      params: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-10-01T00:00:00.000Z',
        timezone: 'UTC',
      },
    });
    expect(result).toEqual([task]);
  });
});

describe('sendChat', () => {
  it('calls POST /chat with the message body', async () => {
    mocks.post.mockResolvedValue({
      data: { type: 'message', text: 'hello', tools: [] },
    });

    const result = await sendChat({ message: 'hi', timezone: 'UTC' });

    expect(mocks.post).toHaveBeenCalledWith('/chat', {
      message: 'hi',
      timezone: 'UTC',
    });
    expect(result).toEqual({ type: 'message', text: 'hello', tools: [] });
  });
});

describe('confirmApproval', () => {
  it('calls POST /chat/confirm with the decision', async () => {
    mocks.post.mockResolvedValue({ data: { type: 'cancelled' } });

    const result = await confirmApproval({ token: 'tok-1', approve: false });

    expect(mocks.post).toHaveBeenCalledWith('/chat/confirm', {
      token: 'tok-1',
      approve: false,
    });
    expect(result).toEqual({ type: 'cancelled' });
  });
});

describe('getUserTimezone', () => {
  it('returns a non-empty IANA timezone string or UTC', () => {
    const timezone = getUserTimezone();
    expect(typeof timezone).toBe('string');
    expect(timezone.length).toBeGreaterThan(0);
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChat } from './useChat';

const api = vi.hoisted(() => ({
  getUserTimezone: vi.fn(() => 'UTC'),
  sendChat: vi.fn(),
  confirmApproval: vi.fn(),
}));

vi.mock('@lib/api', () => api);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  api.sendChat.mockReset();
  api.confirmApproval.mockReset();
});

describe('useChat', () => {
  it('appends the user message and the assistant reply', async () => {
    api.sendChat.mockResolvedValueOnce({
      type: 'message',
      text: 'You have one event.',
      tools: ['get_schedule'],
    });

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.send('  What is on my calendar?  ');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      content: 'What is on my calendar?',
    });
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'You have one event.',
      tools: ['get_schedule'],
    });
    expect(api.sendChat).toHaveBeenCalledWith({
      message: 'What is on my calendar?',
      timezone: 'UTC',
    });
  });

  it('ignores blank input without calling the API', async () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.send('   ');
    });

    expect(api.sendChat).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it('shows an error message when the API request fails', async () => {
    api.sendChat.mockRejectedValueOnce(new Error('backend is down'));

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.send('hello');
    });

    expect(result.current.error).toBeNull();
    const last = result.current.messages.at(-1) as { role: string; content: string };
    expect(last.role).toBe('assistant');
    expect(last.content).toBe('backend is down');
  });

  it('stores pending approvals returned by the agent', async () => {
    api.sendChat.mockResolvedValueOnce({
      type: 'pending_approval',
      tools: ['create_task'],
      approval: {
        token: 'tok-1',
        operation: 'create_task',
        title: 'Gym',
        startTime: '2026-09-22T15:00:00.000Z',
        endTime: '2026-09-22T16:00:00.000Z',
      },
    });

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.send('Book a gym session');
    });

    const approval = result.current.messages[1] as {
      role: string;
      status: string;
      approval: { token: string };
    };
    expect(approval.role).toBe('assistant');
    expect(approval.status).toBe('pending');
    expect(approval.approval.token).toBe('tok-1');
  });

  it('resolves an approval in the approved and cancelled states', async () => {
    api.sendChat.mockResolvedValueOnce({
      type: 'pending_approval',
      tools: ['create_task'],
      approval: {
        token: 'tok-1',
        operation: 'create_task',
        title: 'Gym',
        startTime: '2026-09-22T15:00:00.000Z',
        endTime: '2026-09-22T16:00:00.000Z',
      },
    });
    api.confirmApproval.mockResolvedValueOnce({ type: 'approved' });

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.send('Book a gym session');
    });
    const message = result.current.messages[1] as { id: string };

    await act(async () => {
      await result.current.resolveApproval(message.id, 'tok-1', true);
    });

    expect(api.confirmApproval).toHaveBeenCalledWith({
      token: 'tok-1',
      approve: true,
    });
    const approved = result.current.messages[1] as {
      status: string;
      approval: { title: string };
    };
    expect(approved.status).toBe('approved');
    expect(approved.approval.title).toBe('Gym');

    api.confirmApproval.mockResolvedValueOnce({ type: 'cancelled' });
    await act(async () => {
      await result.current.resolveApproval(message.id, 'tok-1', false);
    });
    const cancelled = result.current.messages[1] as { status: string };
    expect(cancelled.status).toBe('cancelled');
  });

  it('returns to pending when the approval request itself fails', async () => {
    api.sendChat.mockResolvedValueOnce({
      type: 'pending_approval',
      tools: ['create_task'],
      approval: {
        token: 'tok-1',
        operation: 'create_task',
        title: 'Gym',
        startTime: '2026-09-22T15:00:00.000Z',
        endTime: '2026-09-22T16:00:00.000Z',
      },
    });
    api.confirmApproval.mockRejectedValueOnce(new Error('timeout'));

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.send('Book a gym session');
    });
    const message = result.current.messages[1] as { id: string };

    await act(async () => {
      await result.current.resolveApproval(message.id, 'tok-1', true);
    });

    expect(result.current.error).toBe('timeout');
    const pending = result.current.messages[1] as { status: string };
    expect(pending.status).toBe('pending');
  });

  it('tracks busy state while a request is in flight', async () => {
    let release!: (value: unknown) => void;
    api.sendChat.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));

    const { result } = renderHook(() => useChat(), { wrapper });

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.send('ping');
    });

    expect(result.current.busy).toBe(true);

    await act(async () => {
      release({ type: 'message', text: 'pong', tools: [] });
      await promise;
    });

    expect(result.current.busy).toBe(false);
  });
});
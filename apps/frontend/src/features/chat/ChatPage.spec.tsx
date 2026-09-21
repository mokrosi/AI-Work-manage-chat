import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatPage } from './ChatPage';

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

describe('ChatPage', () => {
  it('shows the empty-state prompt before any message', () => {
    render(<ChatPage />, { wrapper });
    expect(screen.getByText('Ask your AI assistant')).toBeInTheDocument();
  });

  it('sends a message and displays the assistant reply in a bubble', async () => {
    api.sendChat.mockResolvedValueOnce({
      type: 'message',
      text: 'One event found at 9am.',
      tools: ['get_schedule'],
    });

    render(<ChatPage />, { wrapper });

    const input = screen.getByPlaceholderText('Ask to check or schedule a task…');
    fireEvent.change(input, { target: { value: 'Check my day' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText('One event found at 9am.')).toBeInTheDocument();
    expect(api.sendChat).toHaveBeenCalledWith({
      message: 'Check my day',
      timezone: 'UTC',
    });
  });

  it('disables the send button while the input is empty', () => {
    render(<ChatPage />, { wrapper });

    const send = screen.getByRole('button', { name: /send/i });
    expect(send).toBeDisabled();

    const input = screen.getByPlaceholderText('Ask to check or schedule a task…');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(send).toBeEnabled();
  });
});
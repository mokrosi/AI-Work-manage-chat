import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { confirmApproval, getUserTimezone, sendChat } from '@lib/api';
import type { ChatMessage } from './types';

const TASK_QUERY_KEY = 'tasks';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const idRef = useRef(0);

  const nextId = useCallback(() => `msg-${++idRef.current}`, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setError(null);
      setBusy(true);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', content: trimmed },
      ]);

      try {
        const result = await sendChat({
          message: trimmed,
          timezone: getUserTimezone(),
        });

        if (result.type === 'message') {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'assistant',
              content: result.text,
              tools: result.tools,
            },
          ]);
        } else {
          const approvalId = nextId();
          setMessages((prev) => [
            ...prev,
            {
              id: approvalId,
              role: 'assistant',
              approval: result.approval,
              tools: result.tools,
              status: 'pending',
            },
          ]);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong';
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', content: message, tools: [] },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, nextId],
  );

  const resolveApproval = useCallback(
    async (messageId: string, token: string, approve: boolean) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.role === 'assistant' && 'approval' in m
            ? { ...m, status: 'processing' as const }
            : m,
        ),
      );
      try {
        const result = await confirmApproval({ token, approve });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.role === 'assistant' && 'approval' in m
              ? {
                  ...m,
                  status:
                    result.type === 'approved' ? ('approved' as const) : ('cancelled' as const),
                }
              : m,
          ),
        );
        if (result.type === 'approved') {
          await queryClient.invalidateQueries({
            queryKey: [TASK_QUERY_KEY],
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Approval request failed';
        setError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.role === 'assistant' && 'approval' in m
              ? { ...m, status: 'pending' as const }
              : m,
          ),
        );
      }
    },
    [queryClient],
  );

  return { messages, busy, error, send, resolveApproval };
}
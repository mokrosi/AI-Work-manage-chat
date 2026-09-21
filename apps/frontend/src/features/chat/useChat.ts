import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { confirmApproval, editApproval, getUserTimezone, sendChat } from '@lib/api';
import type { ChatMessage } from './types';

const TASK_QUERY_KEY = 'tasks';
const CHAT_STORAGE_KEY = 'taskminder-chat';

function readStoredMessages(): ChatMessage[] {
  try {
    const stored = sessionStorage.getItem(CHAT_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function messageContent(message: ChatMessage): string {
  if (message.role === 'user' || 'content' in message) return message.content;
  return `Proposed task: ${message.approval.title} (${message.approval.startTime} to ${message.approval.endTime})`;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(readStoredMessages);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('Ready');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const idRef = useRef(readStoredMessages().reduce((highest, message) => {
    const value = Number(message.id.replace('msg-', ''));
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0));

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Session storage may be unavailable in privacy-restricted browsers.
    }
  }, [messages]);

  const nextId = useCallback(() => `msg-${++idRef.current}`, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setError(null);
      setBusy(true);
      setStage(/free|available|schedule|calendar/i.test(trimmed) ? 'Checking your calendar...' : 'Understanding your request...');
      const history = messages.map((message) => ({
        role: message.role,
        content: messageContent(message),
      }));
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', content: trimmed },
      ]);

      try {
        const result = await sendChat({
          message: trimmed,
          timezone: getUserTimezone(),
          history,
        });
        setStage(result.tools.some((tool) => /availability|schedule/i.test(tool)) ? 'Finding free slots...' : result.tools.length > 0 ? 'Updating your tasks...' : 'Writing a response...');

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
        setStage('Ready');
      }
    },
    [busy, messages, nextId],
  );

  const editPendingApproval = useCallback(async (messageId: string, values: { title: string; startTime: string; endTime: string }) => {
    const current = messages.find((message) => message.id === messageId);
    if (!current || current.role !== 'assistant' || !('approval' in current)) return;
    try {
      const approval = await editApproval({ token: current.approval.token, ...values });
      setMessages((prev) => prev.map((message) => message.id === messageId && message.role === 'assistant' && 'approval' in message ? { ...message, approval } : message));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not edit this proposal');
    }
  }, [messages]);

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

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    try {
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // Session storage may be unavailable in privacy-restricted browsers.
    }
  }, []);

  return { messages, busy, stage, error, send, resolveApproval, editPendingApproval, clear };
}
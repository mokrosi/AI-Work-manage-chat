import { useState, type FormEvent } from 'react';
import { Button } from '@ui/button';
import { Card, CardContent } from '@ui/card';
import { Input } from '@ui/input';
import { useChat } from './useChat';
import type { ChatMessage } from './types';
import { ApprovalCard } from './ApprovalCard';

function ToolsBadge({ tools }: { tools: string[] }) {
  if (tools.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {tools.map((tool) => (
        <span
          key={tool}
          className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
          title="Executed by Agent 2"
        >
          {tool.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}

function MessageRow({
  message,
  onResolveApproval,
}: {
  message: ChatMessage;
  onResolveApproval: (messageId: string, token: string, approve: boolean) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  if ('approval' in message) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Agent 1</span>
        <ApprovalCard
          approval={message.approval}
          status={message.status}
          onResolve={(approve) =>
            onResolveApproval(message.id, message.approval.token, approve)
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">Agent 1</span>
      <div className="max-w-[80%] space-y-2 rounded-lg bg-secondary px-4 py-2 text-sm">
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.tools.length > 0 && (
          <div className="border-t border-border pt-2">
            <ToolsBadge tools={message.tools} />
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatPage() {
  const { messages, busy, error, send, resolveApproval } = useChat();
  const [input, setInput] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input;
    setInput('');
    void send(text);
  }

  return (
    <Card className="flex h-[calc(100vh-8rem)] flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="my-auto text-center text-sm text-muted-foreground">
            <p className="text-base font-medium text-foreground">
              Ask your AI assistant
            </p>
            <p className="mx-auto mt-2 max-w-sm">
              For example: “Do I have time for a 1-hour gym session on Tuesday at
              3pm? If so, schedule it.”
            </p>
          </div>
        )}
        {messages.map((m) => (
          <MessageRow
            key={m.id}
            message={m}
            onResolveApproval={(messageId, token, approve) =>
              void resolveApproval(messageId, token, approve)
            }
          />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span>Agent 1 is thinking — Agent 2 is ready to execute…</span>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </CardContent>
      <form onSubmit={onSubmit} className="flex gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask to check or schedule a task…"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
}
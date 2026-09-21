import { useState, type FormEvent } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
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
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-semibold text-teal-700"><Sparkles className="h-4 w-4" /> Your planning partner</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Talk it through.</h1><p className="mt-1 text-sm text-slate-500">Ask about time, priorities, or the next task to put on your calendar.</p></div><div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 sm:flex sm:items-center sm:gap-2"><Bot className="h-3.5 w-3.5 text-teal-600" /> Agent ready</div></div>
      <Card className="flex h-[calc(100vh-12rem)] min-h-[480px] flex-col border-slate-200/80 shadow-sm">
      <CardContent className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 && (
          <div className="my-auto text-center text-sm text-muted-foreground">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Bot className="h-5 w-5" /></div>
            <p className="mt-4 text-base font-semibold text-foreground">Ask your AI assistant</p>
            <p className="mx-auto mt-2 max-w-sm leading-6">Try asking whether you have time for something, or let me turn a thought into a scheduled task.</p>
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
      <form onSubmit={onSubmit} className="flex gap-2 border-t bg-slate-50/70 p-3 sm:p-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask to check or schedule a task…"
          disabled={busy}
        />
        <Button type="submit" size="icon" aria-label="Send message" disabled={busy || !input.trim()}>
          <Send />
        </Button>
      </form>
      </Card>
    </div>
  );
}
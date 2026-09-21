# Chat Feature

Wires the user conversation to the Multi-Agent backend (`POST /api/chat`).

Planned components (Phase 6):
- `ChatPage` — renders the message thread + input.
- `MessageBubble` — the chat bubble.
- `AgentIndicator` — badge/spinner shown while Agent 2 (Executor) runs a tool.
- `useChat` hook — manages message state and streaming.
- `ConfirmCreateTask` — the "Confirm/Cancel" human-in-the-loop approval
  rendered when Agent 2 wants to run `create_task` (Task 7.2).

Backend contract: the request body is `{ message: string; timezone: string }`.

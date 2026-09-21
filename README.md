# AI Task Management

AI Task Management is a friendly workspace for turning conversations into scheduled work. It combines an AI chat assistant with a task calendar while keeping database writes behind explicit user approval.

This repository is a monorepo containing a NestJS API, React frontend, PostgreSQL database, Prisma data access, and an OpenAI-compatible LLM gateway.

## What You Can Do

The backend exposes task CRUD, calendar, chat, and approval endpoints. The frontend provides Chat, Today, and Calendar views for planning and managing work.

### Chat

- Ask what is on your calendar or whether a time is free.
- Review, edit, confirm, or cancel proposed task creations in the chat.
- Continue a conversation while switching between views.
- Clear chat manually; history is kept for the current browser tab and disappears when the tab closes.
- Use prompt chips, `/`, `Ctrl/Cmd + K`, or the microphone button where Web Speech is supported.

### Task views

- **Today**: focused daily agenda with previous/next day navigation, quick add, and one-click completion.
- **Calendar**: week, month, and day views with search, status filtering, direct editing, deletion, and overlap validation.
- Tasks are stored in UTC and displayed in the browser's local timezone.

### Implemented backend capabilities

Agent 2 - Executor (deterministic task/calendar operations):

- Get a user's schedule for a time window
- Check calendar availability
- Create, update, and delete tasks
- Prevent overlapping tasks
- Validate time ranges and IANA timezones
- Return structured JSON success and error results

Agent 1 - Communicator (`AgentOrchestratorService`):

- Builds a system prompt with the current date, time, and user timezone
- Calls an LLM through the `ILlmGateway` port (OpenAI adapter via the Vercel AI SDK)
- Exposes the Agent 2 use cases as LLM tools with Zod input schemas
- Injects the `userId` before delegating to Agent 2
- Human-in-the-loop: `create_task` returns a pending-approval token instead of writing immediately; the proposal can be edited, confirmed, or cancelled

Frontend (`apps/frontend`):

- React + Vite + TypeScript + Tailwind with shadcn-style UI primitives
- AI chat with approval cards, conversation persistence, transparent execution stages, prompt chips, and optional voice input
- Calendar command center with task search, status filters, counts, upcoming tasks, quick completion, and full CRUD editing

### Known follow-up work

- Persistent (non in-memory) pending-approval storage
- Authentication and multi-user session handling
- Reminders, recurring tasks, and richer task metadata such as priority or labels

## Architecture

```text
Agent 1 / API caller
        |
        v
AgentOrchestratorService  --->  ILlmGateway  --->  OpenAiGateway (OpenAI)
        |                                              |
        |  LLM tool calls                              v
        v                                          Vercel AI SDK
TaskExecutorService
        |
        +-- Zod command validation
        +-- Application use cases
        |     +-- GetSchedule
        |     +-- CheckAvailability
        |     +-- CreateTask
        |     +-- UpdateTask
        |     +-- DeleteTask
        |
        v
ITaskRepository
        |
        v
PrismaTaskRepository
        |
        v
PostgreSQL
```

The domain layer does not depend on Prisma or the AI SDK. Dates are stored as UTC `DateTime` values in PostgreSQL. Timezone validation is performed at the application boundary. The Application layer depends on the `ILlmGateway` port, so the LLM provider can be swapped without touching business logic.

## Requirements

- Node.js 20 or newer
- npm
- Docker Desktop, for PostgreSQL
- An OpenAI-compatible API key (only needed for Agent 1 / chat)

## Setup

Install dependencies from the repository root:

```bash
npm install
```

Start PostgreSQL:

```bash
npm run db:up
```

Configure the backend environment. Edit `apps/backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ai_task_db?schema=public
PORT=3000
NODE_ENV=development
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-1.5-flash:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MAX_TOOL_STEPS=8

# OPENAI_API_KEY and OPENAI_MODEL are also supported.
```

Generate the Prisma client, apply migrations, and seed:

```bash
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend
```

## Testing and Builds

Run the complete test suite from the repository root:

```bash
npm test
```

Run one workspace:

```bash
npm run test:backend
npm run test:frontend
```

Build both applications:

```bash
npm run build
```

### Verified status

As of 2026-09-21, the project passes:

- 62 backend tests
- 27 frontend tests
- Backend and frontend builds

The frontend build prints a non-blocking Vite chunk-size warning.

## Development

Start both applications together:

```bash
npm run dev
```

Or start the backend in watch mode:

```bash
npm run start:dev --workspace=backend
```

The backend listens on `http://localhost:3000/api`.

Start the frontend dev server:

```bash
npm run dev --workspace=frontend
```

Build both apps from the repository root:

```bash
npm run build
```

Open Prisma Studio:

```bash
npm run prisma:studio --workspace=backend
```

Stop PostgreSQL:

```bash
npm run db:down
```

Open the frontend at `http://localhost:5173`. The API is available at `http://localhost:3000/api`.

## Agent 2 Command Contract

`TaskExecutorService.execute()` accepts a discriminated command object. Every command includes an `operation` and an operation-specific `input` object.

Example availability command:

```json
{
  "operation": "check_availability",
  "input": {
    "userId": "user-id",
    "start": "2026-09-21T13:00:00.000Z",
    "end": "2026-09-21T14:00:00.000Z",
    "timezone": "America/New_York"
  }
}
```

Successful results use this shape:

```json
{
  "ok": true,
  "operation": "check_availability",
  "data": {
    "available": true
  }
}
```

Failures use this shape:

```json
{
  "ok": false,
  "operation": "create_task",
  "error": {
    "code": "TIME_CONFLICT",
    "message": "The requested task overlaps an existing task"
  }
}
```

Supported operation names are `get_schedule`, `check_availability`, `create_task`, `update_task`, and `delete_task`.

## Agent 1 Orchestration

`AgentOrchestratorService.handleMessage(message, timezone, userId, history)` runs the LLM with the Agent 2 tools bound and returns either:

- `{ type: 'message', text }` for conversational replies, or
- `{ type: 'pending_approval', approval }` when Agent 1 proposes a `create_task`.

`AgentOrchestratorService.confirm(token, approve)` consumes a pending approval. If approved, it runs the deferred `create_task` through `TaskExecutorService`; if cancelled, the pending change is discarded. `editApproval()` updates the proposed title and time before confirmation. Approvals expire after 10 minutes.

The HTTP endpoints are `POST /api/chat`, `POST /api/chat/confirm`, and `POST /api/chat/confirm/edit`.

## Project Structure

```text
apps/backend/
  prisma/
    schema.prisma
    seed.ts
    migrations/
  src/
    domain/
      entities/
      repositories/
    application/
      errors/
      ports/          # ILlmGateway abstraction
      services/       # TaskExecutor, AgentOrchestrator, PendingApprovalStore
      tools/          # Zod schemas exposed to the LLM
      use-cases/
    infrastructure/
      ai/             # OpenAiGateway adapter
      database/       # PrismaService, PrismaTaskRepository
    presentation/
      controllers/    # HealthController
apps/frontend/
  src/
    components/ui/    # shadcn-style primitives
    features/
      chat/           # ChatPage (placeholder)
      calendar/       # CalendarPage (placeholder)
    lib/
```

See [work_plan.md](work_plan.md) for the complete multi-agent implementation roadmap.

## Troubleshooting

### `Request failed with status code 500`

1. Confirm the backend is running on port 3000.
2. Open `http://localhost:3000/api/health`; it should return a JSON object with `status: "ok"`.
3. Check that `DATABASE_URL` points to the PostgreSQL container.
4. For chat, confirm `OPENROUTER_API_KEY` or `OPENAI_API_KEY` is configured.
5. Check the backend terminal for the structured error code.

### `EADDRINUSE: address already in use :::3000`

Only one backend can listen on port 3000. Stop the old development server, or change `PORT` in the backend environment and the `/api` proxy target in `apps/frontend/vite.config.ts`.

### Tasks do not appear

Check PostgreSQL, run the Prisma migration and seed commands, then refresh the page. Calendar requests use the browser timezone, so verify that the displayed day matches your local timezone.

## Planned Extensions

The current codebase has clear boundaries for future work, but these features are not enabled yet:

- PostgreSQL-backed approval storage for multi-instance deployments.
- Full RRULE recurrence expansion and series editing.
- Priority/category fields and richer calendar color taxonomy.
- Google Calendar, Outlook, and iCal adapters.
- Scheduled reminders through a worker and notification provider.
- Semantic search using a search or vector-storage adapter.
- Authentication and per-user sessions.

These should be added behind application ports and tested against the deterministic task use cases rather than embedded directly in React components or the LLM gateway.

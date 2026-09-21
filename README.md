# AI Task Management

A multi-agent task and calendar management system built around Clean Architecture.

## Current Status

The backend exposes the task CRUD, calendar, chat, and approval endpoints. The frontend provides an AI chat workspace and a calendar command center with direct task CRUD, search, status filters, quick completion, conflict validation, and local-time scheduling.

### Implemented

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
- Human-in-the-loop: `create_task` returns a pending-approval token instead of writing immediately; the change is saved only after confirmation

Frontend (`apps/frontend`):

- React + Vite + TypeScript + Tailwind with shadcn-style UI primitives
- AI chat with approval cards for proposed task creation
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
- An OpenAI API key (only needed for Agent 1 / chat)

## Setup

Install dependencies from the repository root:

```bash
npm install
```

Start PostgreSQL:

```bash
npm run db:up
```

Configure the backend environment. Edit `apps/backend/.env` (see `.env.example` for the defaults):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ai_task_db?schema=public
PORT=3000
NODE_ENV=development
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Generate the Prisma client, apply migrations, and seed:

```bash
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend
```

## Testing

Run the automated backend test suite from the repository root:

```bash
npm test
```

This executes the Node.js test runner for the backend, including coverage for task execution, approvals, and AI gateway configuration.

For a backend-only run:

```bash
npm run test --workspace=backend
```

### Verified status

As of 2026-09-21, the project passes:

- 10 backend tests
- Backend build
- Frontend build

## Development

Start the backend in watch mode:

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

`AgentOrchestratorService.handleMessage(message, timezone, userId)` runs the LLM with the Agent 2 tools bound and returns either:

- `{ type: 'message', text }` for conversational replies, or
- `{ type: 'pending_approval', approval }` when Agent 1 proposes a `create_task`.

`AgentOrchestratorService.confirm(token, approve)` consumes a pending approval. If approved, it runs the deferred `create_task` through `TaskExecutorService`; if cancelled, the pending change is discarded. Approvals expire after 10 minutes.

These services are wired into `ApplicationModule` but are not yet reachable over HTTP.

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

### Multi-Agent Architecture: Roles and Responsibilities

To use two agents simultaneously and effectively, we will implement a **Delegation Pattern** (often referred to as an Orchestrator/Worker or Supervisor pattern).

* **Agent 1: The Communicator (User Interaction Agent)**
* **Role:** Acts as the front-facing assistant handling natural language processing, user intent recognition, and conversation context.
* **Responsibilities:**
* Receives the user's prompt (e.g., "Do I work on Sunday?").
* Identifies if the user is just chatting or if they need database/calendar actions.
* Extracts relevant parameters (dates, times, task names) from the natural language.
* Delegates specific data tasks to Agent 2.
* Receives raw data from Agent 2 and formats it into a human-friendly, conversational response.




* **Agent 2: The Executor (Calendar & Database Operations Agent)**
* **Role:** Acts as the backend specialist responsible for executing calendar and database operations only.
* **Responsibilities:**
* Has direct access to the application tools (for example, `check_availability`, `create_task`, and `update_task`).
* Receives structured commands and validated parameters from Agent 1, not the raw user prompt.
* Executes the necessary database queries through the Clean Architecture use cases.
* Returns raw, structured JSON data—such as success, error, or query results—back to Agent 1.





---

## Full Implementation Plan

### Phase 1: System Design and Environment Setup

> **Status: DONE** — npm workspaces monorepo, NestJS backend, React/Vite/Tailwind/shadcn frontend, Postgres 16 in Docker (host port 5433), Prisma.

*Focus: Establishing the repository structure, selecting the stack, and defining the Clean Architecture boundaries.*

* **Task 1.1: Project Initialization.** Set up a monorepo or two separate repositories for the backend (Node.js/NestJS) and frontend (React).
* **Task 1.2: Database Provisioning.** Initialize a PostgreSQL database and configure your ORM (e.g., Prisma or Drizzle).
* **Task 1.3: Clean Architecture Scaffolding (Backend).** Create the directory structure for Domain, Application, Infrastructure, and Presentation layers.
* **Task 1.4: Feature-Based Scaffolding (Frontend).** Set up the React project with Tailwind CSS and base UI components (e.g., shadcn/ui). Create folders for the `Chat` feature and `Calendar` feature.

### Phase 2: Domain and Database Implementation (Infrastructure & Domain Layers)

> **Status: DONE** — Task/User entities, Prisma schema + migration applied, `ITaskRepository` interface + Prisma implementation.

*Focus: Defining entities, database schemas, and data access repositories.*

* **Task 2.1: Domain Entity Modeling.** Define the core TypeScript interfaces for `Task` and `User` within the Domain layer (independent of the ORM).
* **Task 2.2: Database Schema Creation.** Write the ORM schema for tasks, including required fields like ID, title, description, start time, end time, and status. Run database migrations.
* **Task 2.3: Repository Interfaces.** Create the `ITaskRepository` interface in the Domain layer defining methods like `findTasksBetweenDates`, `createTask`, and `checkTimeOverlap`.
* **Task 2.4: Repository Implementation.** Implement the `ITaskRepository` interface in the Infrastructure layer, mapping the ORM logic to the Domain interfaces.

### Phase 3: Business Logic and Tool Creation (Application Layer)

> **Status: DONE** — GetSchedule/CheckAvailability/CreateTask/UpdateTask/DeleteTask use cases (timezone + window validation, double-booking prevention), Zod tool schemas, `TaskExecutorService`.

*Focus: Building the use cases that Agent 2 will trigger.*

* **Task 3.1: Read Use Cases.** Implement the `GetSchedule` and `CheckAvailability` use cases. These will handle the logic of validating timezones and querying the repository.
* **Task 3.2: Write Use Cases.** Implement the `CreateTask` and `UpdateTask` use cases. Include business logic to prevent double-booking before saving to the repository.
* **Task 3.3: Tool Wrapping.** Wrap these use cases into standardized "Tools" or "Functions" that an AI model can understand, ensuring strict input validation schema (e.g., using Zod) for expected dates and strings.

### Phase 4: Multi-Agent System Integration (AI Infrastructure)

> **Status: DONE** — Agent 1 = LLM (Vercel AI SDK v7 + OpenAI), Agent 2 = deterministic `TaskExecutorService`, `AgentOrchestratorService` with human-in-the-loop interception for `create_task`. Requires `OPENAI_API_KEY` to enable the chat endpoint.

*Focus: Connecting the LLMs and defining the communication between Agent 1 and Agent 2.*

* **Task 4.1: Agent Setup.** Integrate your chosen AI SDK (like Vercel AI SDK or LangChain) in the Infrastructure layer.
* **Task 4.2: Prompt Engineering for Agent 2 (Executor).** Configure Agent 2 with a strict system prompt instructing it to *only* execute tools and return structured JSON. Bind the tools created in Task 3.3 to this agent.
* **Task 4.3: Prompt Engineering for Agent 1 (Communicator).** Configure Agent 1 with a dynamic system prompt that injects the current server date, time, and user timezone. Instruct it on how to delegate complex queries to Agent 2.
* **Task 4.4: Agent Orchestration Logic.** Write a service in the Application layer that manages the lifecycle: intercepting the user message, passing it to Agent 1, catching Agent 1's delegation request, triggering Agent 2, and passing the results back to Agent 1 for the final answer.

### Phase 5: API and Controller Development (Presentation Layer)

> **Status: DONE** — `POST /api/chat`, `POST /api/chat/confirm`, full CRUD `/api/tasks`, global exception filter (clean HTTP codes: 4xx domain errors, 503 no-AI-key, 504 AI timeouts). REST smoke-tested.

*Focus: Exposing the backend logic to the frontend via REST APIs.*

* **Task 5.1: Chat API Endpoint.** Create a POST endpoint that accepts the user's message and timezone, feeds it into the Multi-Agent service, and returns/streams the AI's response.
* **Task 5.2: Calendar API Endpoints.** Create standard REST endpoints (GET, POST, PUT, DELETE) for the tasks. This is necessary for the Calendar page to fetch and display events independently of the chat.
* **Task 5.3: Error Handling & Logging.** Implement a global exception filter to catch database errors, AI timeout errors, or invalid tool calls, returning clean HTTP status codes to the frontend.

### Phase 6: Frontend Development (React)

> **Status: DONE** — Axios API client, React Query provider, Chat page (Agent 2 tool badges + executing indicator, Confirm/Cancel approval card), Calendar page (FullCalendar), and cross-feature query invalidation on task approval.

*Focus: Building the two pages and wiring them to the backend.*

* **Task 6.1: Global State & API Client.** Set up API fetching (e.g., Axios or React Query) to handle data synchronization between the chat and the calendar.
* **Task 6.2: Chat Page UI.** Build the chat interface. Include visual indicators (like a loading spinner or badge) that show when Agent 2 is executing a database tool in the background.
* **Task 6.3: Calendar Page UI.** Integrate a library like `@fullcalendar/react`. Connect it to the Calendar API endpoints to display tasks visually.
* **Task 6.4: Cross-Feature Synchronization.** Implement state invalidation. Ensure that if the user creates a meeting via the Chat page, the Calendar page data is immediately invalidated and refetched so the new event appears seamlessly.

### Phase 7: Edge Cases, Testing, and Refinement

> **Status: DONE (HITL + UTC boundary) / PARTIAL (e2e)** — 7.1 UTC storage + local display verified; 7.2 Confirm/Cancel safeguard implemented (backend tokens + frontend card); 7.3 REST + full-stack proxy flows smoke-tested. The end-to-end *AI-driven* chat→calendar flow still needs a real `OPENAI_API_KEY`.

*Focus: Hardening the system against real-world usage problems.*

* **Task 7.1: Timezone Standardization.** Review the entire stack to ensure all dates are converted to UTC before saving to the database, and correctly localized back to the user's timezone in both the frontend Calendar and the AI prompts.
* **Task 7.2: Human-in-the-Loop Safeguards.** (Optional but recommended) Modify the frontend chat so that if Agent 2 wants to execute `CreateTask`, the UI renders a "Confirm/Cancel" button for the user to approve the meeting before the DB write occurs.
* **Task 7.3: End-to-End Testing.** Simulate chat flows to ensure Agent 1 correctly understands context, Agent 2 correctly hits the database, and the Calendar accurately reflects the changes.
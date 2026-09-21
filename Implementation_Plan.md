# Implementation Plan: AI Chat & Calendar System (Single Agent)

## Project Overview
This project is an AI-driven task and calendar management system. It relies on a **Single Agent Architecture** connected to OpenRouter. The AI agent acts as the sole orchestrator: it converses with the user, determines when to read/write to the database via Tool Calling, waits for the backend to execute the database query, and formulates a natural language response based on the results.

**Tech Stack:**
* **Frontend:** React (Next.js recommended) - Modular Component-Based Architecture.
* **Backend:** Node.js (NestJS or Express) - Clean Architecture.
* **Database:** PostgreSQL with an ORM (e.g., Prisma or Drizzle).
* **AI Provider:** OpenRouter API (using a tool-calling capable model like GPT-4o or Claude 3.5 Sonnet).

---

## Phase 1: Project Setup & Scaffolding
*Focus: Initializing repositories and establishing architectural boundaries.*

* **Task 1.1: Backend Initialization (Node.js)**
  * Initialize the backend project.
  * Scaffold the Clean Architecture directory structure: `Domain`, `Application`, `Infrastructure`, and `Presentation`.
* **Task 1.2: Frontend Initialization (React)**
  * Initialize the React/Next.js project.
  * Set up Tailwind CSS and component libraries (e.g., shadcn/ui).
  * Establish a feature-based folder structure (e.g., `features/chat`, `features/calendar`, `components/ui`).
* **Task 1.3: Database Provisioning**
  * Set up the PostgreSQL database.
  * Initialize the ORM and establish the database connection within the Infrastructure layer.

## Phase 2: Core Domain & Database Implementation (Backend)
*Focus: Defining the rules of the system and database interactions.*

* **Task 2.1: Domain Entities & Interfaces**
  * Define the `Task`/`Event` entity (ID, title, description, startTime, endTime) in the Domain layer.
  * Create the `ITaskRepository` interface defining required database operations (e.g., `createTask`, `findTasksByDateRange`, `checkOverlap`).
* **Task 2.2: Database Schema & Migrations**
  * Write the ORM schema for the Task table.
  * Generate and run the initial database migrations.
* **Task 2.3: Repository Implementation (Infrastructure Layer)**
  * Implement the `ITaskRepository` interface using the ORM.
  * Write the actual PostgreSQL queries to handle data insertion and retrieval.

## Phase 3: AI Integration & Business Logic (Application & Infrastructure)
*Focus: Building the Single Agent's brain and connecting it to database actions.*

* **Task 3.1: Core Use Cases (Application Layer)**
  * Write the Application Use Cases: `CreateTaskUseCase`, `CheckAvailabilityUseCase`, and `GetScheduleUseCase`. These will encapsulate the business logic and call the repository.
* **Task 3.2: AI Tools Definition**
  * Map the Use Cases into JSON Schemas (Tools/Functions) that OpenRouter models can understand (e.g., define the required parameters like `startDate` and `endDate` for the AI to fill out).
* **Task 3.3: System Prompt Engineering**
  * Draft a dynamic System Prompt for the AI Agent. 
  * Ensure the prompt injects the user's current local date, time, and timezone context so the agent accurately understands relative terms like "tomorrow" or "Sunday".
* **Task 3.4: The Execution Loop (Agent Flow)**
  * Develop the logic to handle the OpenRouter API lifecycle:
    1. Send user message to OpenRouter.
    2. Intercept Tool Call requests from the AI.
    3. Execute the corresponding Use Case (Database action).
    4. Return the database execution result back to OpenRouter.
    5. Stream the AI's final natural language response back to the client.

## Phase 4: Frontend Development (Presentation)
*Focus: Building the user interfaces and connecting them to the backend APIs.*

* **Task 4.1: API Endpoints (Backend Presentation Layer)**
  * Create the REST API or Server Actions required for the frontend to communicate with the backend (e.g., `/api/chat` and `/api/tasks`).
* **Task 4.2: Calendar Page Development**
  * Integrate a calendar library (e.g., FullCalendar).
  * Build the layout for the second page to display tasks and events.
  * Connect the calendar to the backend API to fetch and render tasks dynamically.
* **Task 4.3: Chat Page Development**
  * Build the primary chat interface (message list, input field).
  * Implement UI indicators (e.g., a loading spinner or "Agent is checking calendar..." badge) to show when the AI is executing a database tool.

## Phase 5: State Synchronization & Refinement
*Focus: Ensuring a seamless user experience and preventing edge-case bugs.*

* **Task 5.1: Real-Time Synchronization**
  * Implement state management strategies (e.g., React Query invalidation or Context API) so that when the Agent creates a new task in the Chat, the Calendar page data is immediately refreshed without requiring a hard page reload.
* **Task 5.2: Timezone Standardization**
  * Audit the entire data flow to ensure all dates are converted to UTC before saving to PostgreSQL, and accurately converted back to the user's local timezone when displayed on the Calendar or passed to the AI Prompt.
* **Task 5.3: Error Handling & Constraints**
  * Implement safeguards in the backend Use Cases to prevent double-booking.
  * Ensure the AI Agent gracefully communicates any database errors (like scheduling conflicts) to the user.
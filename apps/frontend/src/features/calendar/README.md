# Calendar Feature

Displays tasks fetched from the backend Calendar API (`/api/tasks`).

Planned components (Phase 6):
- `CalendarPage` — renders the FullCalendar grid.
- `useTasks` hook / React Query — fetches and caches tasks (Task 6.1).
- Integration with `@fullcalendar/react` (Task 6.3).
- State invalidation so a task created via Chat refetches here (Task 6.4).

Backend contract (Phase 5): GET /api/tasks returns an array of tasks.

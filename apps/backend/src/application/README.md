# Application Layer

Business logic lives here as use cases. Structure:

```
application/
  use-cases/     -> GetSchedule, CheckAvailability, CreateTask, UpdateTask (Phase 3)
  ports/         -> inbound/outbound ports the use cases depend on
  services/      -> orchestration service that coordinates Agent 1 (Communicator)
                    and Agent 2 (Executor) (Phase 4)
```

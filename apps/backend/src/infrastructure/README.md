# Infrastructure Layer

External implementations of domain interfaces. Structure:

```
infrastructure/
  database/     -> PrismaService + connection module
  repositories/ -> PrismaTaskRepository implements ITaskRepository (Phase 2)
  ai/           -> AI SDK integration + Agent 1 / Agent 2 bindings (Phase 4)
```

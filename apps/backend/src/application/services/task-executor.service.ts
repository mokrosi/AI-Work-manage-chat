import { Injectable } from '@nestjs/common';
import { ApplicationError } from '@application/errors/application.error';
import {
  CheckAvailabilityUseCase,
  CreateTaskUseCase,
  DeleteTaskUseCase,
  GetScheduleUseCase,
  UpdateTaskUseCase,
} from '@application/use-cases/task.use-cases';
import {
  ExecutorCommand,
  executorCommandSchema,
} from '@application/tools/task.tools';
import { Task } from '@domain/entities/task.entity';

export type ExecutorResult =
  | { ok: true; operation: ExecutorCommand['operation']; data: unknown }
  | {
      ok: false;
      operation?: ExecutorCommand['operation'];
      error: { code: string; message: string };
    };

function serializeTask(task: Task): Record<string, unknown> {
  return {
    ...task,
    startTime: task.startTime.toISOString(),
    endTime: task.endTime.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function serializeData(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item));
  }

  if (data && typeof data === 'object' && 'id' in data && 'startTime' in data) {
    return serializeTask(data as Task);
  }

  return data;
}

@Injectable()
export class TaskExecutorService {
  constructor(
    private readonly getSchedule: GetScheduleUseCase,
    private readonly checkAvailability: CheckAvailabilityUseCase,
    private readonly createTask: CreateTaskUseCase,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
  ) {}

  async execute(rawCommand: unknown): Promise<ExecutorResult> {
    const parsed = executorCommandSchema.safeParse(rawCommand);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: 'INVALID_COMMAND',
          message: parsed.error.issues.map((issue) => issue.message).join('; '),
        },
      };
    }

    const command = parsed.data;

    try {
      let data: unknown;
      switch (command.operation) {
        case 'get_schedule':
          data = await this.getSchedule.execute(command.input);
          break;
        case 'check_availability':
          data = await this.checkAvailability.execute(command.input);
          break;
        case 'create_task':
          data = await this.createTask.execute(command.input);
          break;
        case 'update_task':
          data = await this.updateTask.execute(command.input);
          break;
        case 'delete_task':
          data = await this.deleteTask.execute(command.input);
          break;
      }

      return {
        ok: true,
        operation: command.operation,
        data: serializeData(data),
      };
    } catch (error) {
      const applicationError =
        error instanceof ApplicationError
          ? error
          : new ApplicationError('EXECUTION_FAILED', 'Task operation failed');

      return {
        ok: false,
        operation: command.operation,
        error: {
          code: applicationError.code,
          message: applicationError.message,
        },
      };
    }
  }
}

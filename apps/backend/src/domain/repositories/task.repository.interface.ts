import { Task, TaskStatus } from '@domain/entities/task.entity';

/**
 * Repository interface for tasks.
 *
 * Defined in the Domain layer so the Application layer depends on an
 * abstraction, not on Prisma. The concrete implementation lives in the
 * Infrastructure layer.
 */
export interface ITaskRepository {
  findTasksBetweenDates(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<Task[]>;

  findTaskById(id: string): Promise<Task | null>;

  findTasksByStatus(userId: string, status: TaskStatus): Promise<Task[]>;

  createTask(input: CreateTaskInput): Promise<Task>;

  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;

  deleteTask(id: string): Promise<Task>;

  /** Returns true if any existing task overlaps [start, end) for the user. */
  checkTimeOverlap(
    userId: string,
    start: Date,
    end: Date,
    excludeTaskId?: string,
  ): Promise<boolean>;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  status?: TaskStatus;
  userId: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  startTime?: Date;
  endTime?: Date;
  status?: TaskStatus;
}

export const ITaskRepository = Symbol('ITaskRepository');

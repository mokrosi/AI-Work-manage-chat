import { Inject, Injectable } from '@nestjs/common';
import { Task, TaskStatus } from '@domain/entities/task.entity';
import {
  CreateTaskInput,
  ITaskRepository,
  UpdateTaskInput,
} from '@domain/repositories/task.repository.interface';
import { ApplicationError } from '@application/errors/application.error';

export interface ScheduleQuery {
  userId: string;
  start: Date;
  end: Date;
  timezone: string;
}

export interface CreateTaskCommand extends CreateTaskInput {
  timezone: string;
}

export interface UpdateTaskCommand extends UpdateTaskInput {
  id: string;
  userId: string;
  timezone: string;
}

function validateWindow(start: Date, end: Date): void {
  if (start >= end) {
    throw new ApplicationError(
      'INVALID_TIME_RANGE',
      'endTime must be later than startTime',
    );
  }
}

function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new ApplicationError('INVALID_TIMEZONE', `Unsupported timezone: ${timezone}`);
  }
}

@Injectable()
export class GetScheduleUseCase {
  constructor(
    @Inject(ITaskRepository) private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(query: ScheduleQuery): Promise<Task[]> {
    validateTimezone(query.timezone);
    validateWindow(query.start, query.end);
    return this.taskRepository.findTasksBetweenDates(
      query.userId,
      query.start,
      query.end,
    );
  }
}

@Injectable()
export class CheckAvailabilityUseCase {
  constructor(
    @Inject(ITaskRepository) private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(query: ScheduleQuery): Promise<{ available: boolean }> {
    validateTimezone(query.timezone);
    validateWindow(query.start, query.end);
    const overlaps = await this.taskRepository.checkTimeOverlap(
      query.userId,
      query.start,
      query.end,
    );
    return { available: !overlaps };
  }
}

@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(ITaskRepository) private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(command: CreateTaskCommand): Promise<Task> {
    validateTimezone(command.timezone);
    validateWindow(command.startTime, command.endTime);
    const overlaps = await this.taskRepository.checkTimeOverlap(
      command.userId,
      command.startTime,
      command.endTime,
    );

    if (overlaps) {
      throw new ApplicationError(
        'TIME_CONFLICT',
        'The requested task overlaps an existing task',
      );
    }

    return this.taskRepository.createTask(command);
  }
}

@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @Inject(ITaskRepository) private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(command: UpdateTaskCommand): Promise<Task> {
    validateTimezone(command.timezone);
    const existing = await this.taskRepository.findTaskById(command.id);

    if (!existing || existing.userId !== command.userId) {
      throw new ApplicationError('TASK_NOT_FOUND', 'Task was not found');
    }

    const startTime = command.startTime ?? existing.startTime;
    const endTime = command.endTime ?? existing.endTime;
    validateWindow(startTime, endTime);

    const overlaps = await this.taskRepository.checkTimeOverlap(
      command.userId,
      startTime,
      endTime,
      command.id,
    );

    if (overlaps) {
      throw new ApplicationError(
        'TIME_CONFLICT',
        'The requested task overlaps an existing task',
      );
    }

    const update: UpdateTaskInput = {
      ...(command.title !== undefined && { title: command.title }),
      ...(command.description !== undefined && {
        description: command.description,
      }),
      ...(command.startTime !== undefined && { startTime: command.startTime }),
      ...(command.endTime !== undefined && { endTime: command.endTime }),
      ...(command.status !== undefined && { status: command.status }),
    };

    return this.taskRepository.updateTask(command.id, update);
  }
}

@Injectable()
export class DeleteTaskUseCase {
  constructor(
    @Inject(ITaskRepository) private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(command: {
    id: string;
    userId: string;
    timezone: string;
  }): Promise<Task> {
    validateTimezone(command.timezone);
    const existing = await this.taskRepository.findTaskById(command.id);

    if (!existing || existing.userId !== command.userId) {
      throw new ApplicationError('TASK_NOT_FOUND', 'Task was not found');
    }

    return this.taskRepository.deleteTask(command.id);
  }
}

export { TaskStatus };

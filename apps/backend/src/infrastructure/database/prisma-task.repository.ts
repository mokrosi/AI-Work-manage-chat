import { Injectable } from '@nestjs/common';
import { Prisma, TaskStatus as PrismaTaskStatus } from '@prisma/client';
import {
  CreateTaskInput,
  ITaskRepository,
  UpdateTaskInput,
} from '@domain/repositories/task.repository.interface';
import { Task, TaskStatus } from '@domain/entities/task.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTasksBetweenDates(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        startTime: { lt: end },
        endTime: { gt: start },
      },
      orderBy: { startTime: 'asc' },
    });

    return tasks.map((task) => this.toDomain(task));
  }

  async findTaskById(id: string): Promise<Task | null> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    return task ? this.toDomain(task) : null;
  }

  async findTasksByStatus(userId: string, status: TaskStatus): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      where: { userId, status: this.toPrismaStatus(status) },
      orderBy: { startTime: 'asc' },
    });

    return tasks.map((task) => this.toDomain(task));
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const task = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        status: this.toPrismaStatus(input.status ?? TaskStatus.PENDING),
        userId: input.userId,
      },
    });

    return this.toDomain(task);
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const data: Prisma.TaskUpdateInput = {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.startTime !== undefined && { startTime: input.startTime }),
      ...(input.endTime !== undefined && { endTime: input.endTime }),
      ...(input.status !== undefined && {
        status: this.toPrismaStatus(input.status),
      }),
    };

    const task = await this.prisma.task.update({ where: { id }, data });
    return this.toDomain(task);
  }

  async deleteTask(id: string): Promise<Task> {
    const task = await this.prisma.task.delete({ where: { id } });
    return this.toDomain(task);
  }

  async checkTimeOverlap(
    userId: string,
    start: Date,
    end: Date,
    excludeTaskId?: string,
  ): Promise<boolean> {
    const task = await this.prisma.task.findFirst({
      where: {
        userId,
        ...(excludeTaskId && { id: { not: excludeTaskId } }),
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: { id: true },
    });

    return task !== null;
  }

  private toDomain(task: Prisma.TaskGetPayload<object>): Task {
    return {
      ...task,
      status: task.status as TaskStatus,
    };
  }

  private toPrismaStatus(status: TaskStatus): PrismaTaskStatus {
    return status as PrismaTaskStatus;
  }
}

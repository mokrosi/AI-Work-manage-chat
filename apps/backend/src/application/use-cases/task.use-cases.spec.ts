import test from 'node:test';
import assert from 'node:assert/strict';

import { TaskStatus } from '@domain/entities/task.entity';
import { PendingApprovalStore } from '@application/services/pending-approval.store';
import { TaskExecutorService } from '@application/services/task-executor.service';
import {
  CheckAvailabilityUseCase,
  CreateTaskUseCase,
  DeleteTaskUseCase,
  GetScheduleUseCase,
  UpdateTaskUseCase,
} from './task.use-cases';

function makeTask(overrides: Partial<Record<string, unknown>> = {}) {
  const base = {
    id: 'task-123',
    title: 'Planning session',
    description: 'Review sprint goals',
    startTime: new Date('2026-09-21T09:00:00.000Z'),
    endTime: new Date('2026-09-21T10:00:00.000Z'),
    status: TaskStatus.PENDING,
    userId: 'user-42',
    createdAt: new Date('2026-09-20T08:00:00.000Z'),
    updatedAt: new Date('2026-09-20T08:30:00.000Z'),
  };

  return { ...base, ...overrides };
}

test('GetScheduleUseCase returns tasks for a valid time window', async () => {
  const task = makeTask();
  const repository = {
    findTasksBetweenDates: async () => [task],
    findTaskById: async () => null,
    findTasksByStatus: async () => [],
    createTask: async () => task,
    updateTask: async () => task,
    deleteTask: async () => task,
    checkTimeOverlap: async () => false,
  };

  const useCase = new GetScheduleUseCase(repository as any);
  const result = await useCase.execute({
    userId: 'user-42',
    start: new Date('2026-09-21T08:00:00.000Z'),
    end: new Date('2026-09-21T12:00:00.000Z'),
    timezone: 'UTC',
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Planning session');
});

test('CheckAvailabilityUseCase rejects invalid timezone and detects conflicts', async () => {
  const repository = {
    findTasksBetweenDates: async () => [],
    findTaskById: async () => null,
    findTasksByStatus: async () => [],
    createTask: async () => makeTask(),
    updateTask: async () => makeTask(),
    deleteTask: async () => makeTask(),
    checkTimeOverlap: async () => true,
  };

  const useCase = new CheckAvailabilityUseCase(repository as any);

  await assert.rejects(
    () =>
      useCase.execute({
        userId: 'user-42',
        start: new Date('2026-09-21T09:00:00.000Z'),
        end: new Date('2026-09-21T10:00:00.000Z'),
        timezone: 'Bad/Zone',
      }),
    /Unsupported timezone: Bad\/Zone/,
  );

  const result = await useCase.execute({
    userId: 'user-42',
    start: new Date('2026-09-21T09:00:00.000Z'),
    end: new Date('2026-09-21T10:00:00.000Z'),
    timezone: 'UTC',
  });

  assert.deepEqual(result, { available: false });
});

test('CreateTaskUseCase blocks overlapping tasks and creates on success', async () => {
  const overlappingRepo = {
    findTasksBetweenDates: async () => [],
    findTaskById: async () => null,
    findTasksByStatus: async () => [],
    createTask: async () => makeTask(),
    updateTask: async () => makeTask(),
    deleteTask: async () => makeTask(),
    checkTimeOverlap: async () => true,
  };

  const createUseCase = new CreateTaskUseCase(overlappingRepo as any);
  await assert.rejects(
    () =>
      createUseCase.execute({
        userId: 'user-42',
        title: 'Meeting',
        description: 'Project sync',
        startTime: new Date('2026-09-21T09:00:00.000Z'),
        endTime: new Date('2026-09-21T10:00:00.000Z'),
        timezone: 'UTC',
      }),
    /The requested task overlaps an existing task/,
  );

  const successRepo = {
    findTasksBetweenDates: async () => [],
    findTaskById: async () => null,
    findTasksByStatus: async () => [],
    createTask: async (input: any) => makeTask({ ...input, id: 'created-1' }),
    updateTask: async () => makeTask(),
    deleteTask: async () => makeTask(),
    checkTimeOverlap: async () => false,
  };

  const created = await new CreateTaskUseCase(successRepo as any).execute({
    userId: 'user-42',
    title: 'Meeting',
    description: 'Project sync',
    startTime: new Date('2026-09-21T09:00:00.000Z'),
    endTime: new Date('2026-09-21T10:00:00.000Z'),
    timezone: 'UTC',
  });

  assert.equal(created.title, 'Meeting');
});

test('UpdateTaskUseCase tracks missing tasks and overlaps before saving', async () => {
  const missingRepo = {
    findTasksBetweenDates: async () => [],
    findTaskById: async () => null,
    findTasksByStatus: async () => [],
    createTask: async () => makeTask(),
    updateTask: async () => makeTask(),
    deleteTask: async () => makeTask(),
    checkTimeOverlap: async () => false,
  };

  await assert.rejects(
    () =>
      new UpdateTaskUseCase(missingRepo as any).execute({
        id: 'task-404',
        userId: 'user-42',
        timezone: 'UTC',
        title: 'Updated title',
      }),
    /Task was not found/,
  );

  const existing = makeTask();
  const overlapRepo = {
    findTasksBetweenDates: async () => [],
    findTaskById: async () => existing,
    findTasksByStatus: async () => [],
    createTask: async () => makeTask(),
    updateTask: async () => makeTask({ title: 'Updated title' }),
    deleteTask: async () => makeTask(),
    checkTimeOverlap: async () => true,
  };

  await assert.rejects(
    () =>
      new UpdateTaskUseCase(overlapRepo as any).execute({
        id: 'task-123',
        userId: 'user-42',
        timezone: 'UTC',
        title: 'Updated title',
      }),
    /The requested task overlaps an existing task/,
  );
});

test('DeleteTaskUseCase only removes owned tasks', async () => {
  const repo = {
    findTasksBetweenDates: async () => [],
    findTaskById: async () => makeTask(),
    findTasksByStatus: async () => [],
    createTask: async () => makeTask(),
    updateTask: async () => makeTask(),
    deleteTask: async () => makeTask({ id: 'deleted-1' }),
    checkTimeOverlap: async () => false,
  };

  const result = await new DeleteTaskUseCase(repo as any).execute({
    id: 'task-123',
    userId: 'user-42',
    timezone: 'UTC',
  });

  assert.equal(result.id, 'deleted-1');
});

test('TaskExecutorService serializes task payloads and rejects invalid commands', async () => {
  const task = makeTask();
  const repo = {
    findTasksBetweenDates: async () => [task],
    findTaskById: async () => task,
    findTasksByStatus: async () => [],
    createTask: async () => task,
    updateTask: async () => task,
    deleteTask: async () => task,
    checkTimeOverlap: async () => false,
  };

  const executor = new TaskExecutorService(
    new GetScheduleUseCase(repo as any),
    new CheckAvailabilityUseCase(repo as any),
    new CreateTaskUseCase(repo as any),
    new UpdateTaskUseCase(repo as any),
    new DeleteTaskUseCase(repo as any),
  );

  const invalid = await executor.execute({ operation: 'bogus', input: {} } as any);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'INVALID_COMMAND');

  const valid = await executor.execute({
    operation: 'get_schedule',
    input: {
      userId: 'user-42',
      start: '2026-09-21T08:00:00.000Z',
      end: '2026-09-21T12:00:00.000Z',
      timezone: 'UTC',
    },
  });

  assert.equal(valid.ok, true);
  assert.equal((valid as any).data[0].startTime, task.startTime.toISOString());
  assert.equal((valid as any).operation, 'get_schedule');
});

test('PendingApprovalStore creates, reads, and expires approvals', async () => {
  const store = new PendingApprovalStore();
  const approval = store.create({
    userId: 'user-42',
    title: 'Standup',
    description: 'Daily sync',
    startTime: new Date('2026-09-21T10:00:00.000Z'),
    endTime: new Date('2026-09-21T10:30:00.000Z'),
    timezone: 'UTC',
    status: TaskStatus.PENDING,
  });

  assert.equal(approval.operation, 'create_task');
  assert.equal(approval.title, 'Standup');

  const same = store.get(approval.token);
  assert.equal(same.token, approval.token);

  const consumed = store.consume(approval.token);
  assert.equal(consumed.token, approval.token);

  assert.throws(() => store.get(approval.token), /Approval not found or expired/);

  const expired = store.create({
    userId: 'user-42',
    title: 'Expired note',
    description: 'Old reminder',
    startTime: new Date('2026-09-21T11:00:00.000Z'),
    endTime: new Date('2026-09-21T11:30:00.000Z'),
    timezone: 'UTC',
    status: TaskStatus.PENDING,
  });
  const expiredToken = expired.token;

  const expiry = store.get(expiredToken);
  const originalExpiresAt = expiry.expiresAt.getTime();
  expiry.expiresAt = new Date(originalExpiresAt - 1000 * 60 * 60 * 24);
  assert.throws(() => store.get(expiredToken), /Approval has expired/);
});

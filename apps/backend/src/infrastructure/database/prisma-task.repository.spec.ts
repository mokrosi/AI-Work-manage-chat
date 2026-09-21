import test from 'node:test';
import assert from 'node:assert/strict';

import { TaskStatus } from '@domain/entities/task.entity';
import { PrismaTaskRepository } from './prisma-task.repository';

function makeRecord(id = 'task-1', overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: 'Planning',
    description: null,
    startTime: new Date('2026-09-21T09:00:00.000Z'),
    endTime: new Date('2026-09-21T10:00:00.000Z'),
    status: 'PENDING',
    userId: 'user-42',
    createdAt: new Date('2026-09-20T08:00:00.000Z'),
    updatedAt: new Date('2026-09-20T08:30:00.000Z'),
    ...overrides,
  };
}

function fakePrisma(
  behavior: Record<string, (args: unknown) => unknown> = {},
): { prisma: never; calls: Record<string, unknown[]> } {
  const calls: Record<string, unknown[]> = {};
  const methods = ['findMany', 'findUnique', 'create', 'update', 'delete', 'findFirst'];
  const task: Record<string, (args: unknown) => Promise<unknown>> = {};

  for (const method of methods) {
    task[method] = async (args: unknown) => {
      (calls[method] ??= []).push(args);
      if (behavior[method]) return behavior[method](args);
      switch (method) {
        case 'findMany':
          return [makeRecord()];
        case 'findUnique':
        case 'findFirst':
          return makeRecord();
        case 'create':
          return makeRecord('created-1', {
            ...((args as { data?: Record<string, unknown> }).data ?? {}),
          });
        case 'update':
          return makeRecord(
            (args as { where?: { id: string } }).where?.id ?? 'updated-1',
            { ...((args as { data?: Record<string, unknown> }).data ?? {}) },
          );
        case 'delete':
          return makeRecord('deleted-1');
        default:
          return undefined;
      }
    };
  }

  return { prisma: { task } as never, calls };
}

function build(overrides: Parameters<typeof fakePrisma>[0]) {
  const { prisma, calls } = fakePrisma(overrides);
  return { repository: new PrismaTaskRepository(prisma), calls };
}

test('findTasksBetweenDates queries the window and maps records to domain tasks', async () => {
  const { repository, calls } = build({});

  const tasks = await repository.findTasksBetweenDates(
    'user-42',
    new Date('2026-09-01T00:00:00.000Z'),
    new Date('2026-09-30T00:00:00.000Z'),
  );

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]!.title, 'Planning');
  assert.equal(tasks[0]!.status, TaskStatus.PENDING);

  const args = calls.findMany[0] as {
    where: { userId: string; startTime: Record<string, Date>; endTime: Record<string, Date> };
  };
  assert.equal(args.where.userId, 'user-42');
  assert.equal(args.where.startTime.lt.toISOString(), '2026-09-30T00:00:00.000Z');
  assert.equal(args.where.endTime.gt.toISOString(), '2026-09-01T00:00:00.000Z');
});

test('findTaskById returns null when the task does not exist', async () => {
  const { repository, calls } = build({ findUnique: async () => null });

  const result = await repository.findTaskById('nope');

  assert.equal(result, null);
  const args = calls.findUnique[0] as { where: { id: string } };
  assert.equal(args.where.id, 'nope');
});

test('findTasksByStatus converts the domain status to the Prisma enum', async () => {
  const { repository, calls } = build({});

  await repository.findTasksByStatus('user-42', TaskStatus.COMPLETED);

  const args = calls.findMany[0] as { where: { status: string } };
  assert.equal(args.where.status, 'COMPLETED');
});

test('createTask defaults to PENDING when no status is given', async () => {
  const { repository, calls } = build({});

  await repository.createTask({
    title: 'New task',
    startTime: new Date('2026-09-21T11:00:00.000Z'),
    endTime: new Date('2026-09-21T12:00:00.000Z'),
    userId: 'user-42',
  });

  const args = calls.create[0] as { data: Record<string, unknown> };
  assert.equal(args.data.status, 'PENDING');
  assert.equal(args.data.title, 'New task');
  assert.equal(args.data.userId, 'user-42');
});

test('createTask honours an explicit status', async () => {
  const { repository, calls } = build({});

  await repository.createTask({
    title: 'New task',
    startTime: new Date('2026-09-21T11:00:00.000Z'),
    endTime: new Date('2026-09-21T12:00:00.000Z'),
    userId: 'user-42',
    status: TaskStatus.IN_PROGRESS,
  });

  const args = calls.create[0] as { data: Record<string, unknown> };
  assert.equal(args.data.status, 'IN_PROGRESS');
});

test('updateTask only sends the fields that changed', async () => {
  const { repository, calls } = build({});

  await repository.updateTask('task-1', { title: 'Renamed' });

  const args = calls.update[0] as {
    where: { id: string };
    data: Record<string, unknown>;
  };
  assert.equal(args.where.id, 'task-1');
  assert.equal(args.data.title, 'Renamed');
  assert.equal('status' in args.data, false);
  assert.equal('startTime' in args.data, false);
});

test('updateTask converts domain status back to the Prisma enum', async () => {
  const { repository, calls } = build({});

  await repository.updateTask('task-1', { status: TaskStatus.COMPLETED });

  const args = calls.update[0] as { data: Record<string, unknown> };
  assert.equal(args.data.status, 'COMPLETED');
});

test('deleteTask removes and returns the task', async () => {
  const { repository, calls } = build({});

  const result = await repository.deleteTask('task-1');

  assert.equal(result.id, 'deleted-1');
  const args = calls.delete[0] as { where: { id: string } };
  assert.equal(args.where.id, 'task-1');
});

test('checkTimeOverlap excludes a task id when one is provided', async () => {
  const { repository, calls } = build({ findFirst: async () => makeRecord() });

  const overlap = await repository.checkTimeOverlap(
    'user-42',
    new Date('2026-09-21T09:00:00.000Z'),
    new Date('2026-09-21T10:00:00.000Z'),
    'task-9',
  );

  assert.equal(overlap, true);
  const args = calls.findFirst[0] as {
    where: {
      userId: string;
      id: Record<string, string>;
      startTime: Record<string, Date>;
      endTime: Record<string, Date>;
    };
  };
  assert.equal(args.where.id.not, 'task-9');
  assert.equal(args.where.startTime.lt.toISOString(), '2026-09-21T10:00:00.000Z');
});

test('checkTimeOverlap returns false when no conflicting task exists', async () => {
  const { repository } = build({ findFirst: async () => null });

  const overlap = await repository.checkTimeOverlap(
    'user-42',
    new Date('2026-09-21T09:00:00.000Z'),
    new Date('2026-09-21T10:00:00.000Z'),
  );

  assert.equal(overlap, false);
});
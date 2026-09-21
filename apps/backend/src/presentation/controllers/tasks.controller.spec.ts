import test from 'node:test';
import assert from 'node:assert/strict';

import { TasksController } from './tasks.controller';
import { TaskStatus } from '@domain/entities/task.entity';

function makeTask() {
  return {
    id: 'task-123',
    title: 'Planning session',
    description: null,
    startTime: new Date('2026-09-21T09:00:00.000Z'),
    endTime: new Date('2026-09-21T10:00:00.000Z'),
    status: TaskStatus.PENDING,
    userId: 'user-42',
    createdAt: new Date('2026-09-20T08:00:00.000Z'),
    updatedAt: new Date('2026-09-20T08:30:00.000Z'),
  };
}

const demoUser = { resolveId: async (userId?: string) => userId ?? 'demo-user' };

function makeSinks() {
  return {
    getSchedule: {
      calls: [] as Array<Record<string, any>>,
      execute: async function (this: { calls: Array<Record<string, any>> }, input: Record<string, any>) {
        this.calls.push(input);
        return [makeTask()];
      },
    },
    createTask: {
      calls: [] as Array<Record<string, any>>,
      execute: async function (this: { calls: Array<Record<string, any>> }, input: Record<string, any>) {
        this.calls.push(input);
        return makeTask();
      },
    },
    updateTask: {
      calls: [] as Array<Record<string, any>>,
      execute: async function (this: { calls: Array<Record<string, any>> }, input: Record<string, any>) {
        this.calls.push(input);
        return makeTask();
      },
    },
    deleteTask: {
      calls: [] as Array<Record<string, any>>,
      execute: async function (this: { calls: Array<Record<string, any>> }, input: Record<string, any>) {
        this.calls.push(input);
        return makeTask();
      },
    },
  };
}

function buildController(sinks = makeSinks(), defaultUser = demoUser) {
  return new TasksController(
    sinks.getSchedule as never,
    sinks.createTask as never,
    sinks.updateTask as never,
    sinks.deleteTask as never,
    defaultUser as never,
  );
}

test('list resolves the demo user and delegates a schedule query', async () => {
  const sinks = makeSinks();
  const controller = buildController(sinks);

  const result = await controller.list({
    from: '2026-09-01T00:00:00.000Z',
    to: '2026-10-01T00:00:00.000Z',
    timezone: 'America/New_York',
  } as never);

  assert.equal(result.length, 1);
  assert.equal(sinks.getSchedule.calls.length, 1);
  const call = sinks.getSchedule.calls[0]!;
  assert.equal(call.userId, 'demo-user');
  assert.equal(call.timezone, 'America/New_York');
  assert.equal(call.start.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(call.end.toISOString(), '2026-10-01T00:00:00.000Z');
});

test('list falls back to the current UTC month when from/to are missing', async () => {
  const sinks = makeSinks();
  const controller = buildController(sinks);

  await controller.list({} as never);

  const call = sinks.getSchedule.calls[0]!;
  assert.equal(call.timezone, 'UTC');
  const start = call.start as Date;
  const end = call.end as Date;
  assert.equal(start.getUTCFullYear(), new Date().getUTCFullYear());
  assert.equal(start.getUTCDate(), 1);
  assert.equal(end.getUTCDate(), 1);
});

test('create parses ISO dates and defaults timezone', async () => {
  const sinks = makeSinks();
  const controller = buildController(sinks);

  const result = await controller.create({
    title: 'Meeting',
    description: 'Project sync',
    startTime: '2026-09-21T09:00:00.000Z',
    endTime: '2026-09-21T10:00:00.000Z',
    status: TaskStatus.IN_PROGRESS,
  } as never);

  assert.equal(result.title, 'Planning session');
  const call = sinks.createTask.calls[0]!;
  assert.equal(call.userId, 'demo-user');
  assert.equal(call.timezone, 'UTC');
  assert.equal(call.title, 'Meeting');
  assert.ok(call.startTime instanceof Date);
  assert.ok(call.endTime instanceof Date);
  assert.equal(call.status, TaskStatus.IN_PROGRESS);
});

test('update resolves the default user and converts date strings', async () => {
  const sinks = makeSinks();
  const controller = buildController(sinks);

  await controller.update('task-123', {
    title: 'Renamed',
    startTime: '2026-09-22T10:00:00.000Z',
  } as never);

  const call = sinks.updateTask.calls[0]!;
  assert.equal(call.id, 'task-123');
  assert.equal(call.userId, 'demo-user');
  assert.equal(call.timezone, 'UTC');
  assert.equal(call.title, 'Renamed');
  assert.ok(call.startTime instanceof Date);
  assert.equal(call.description, undefined);
  assert.equal(call.endTime, undefined);
  assert.equal(call.status, undefined);
});

test('remove uses the query userId and defaults the timezone to UTC', async () => {
  const sinks = makeSinks();
  const controller = buildController(sinks);

  await controller.remove('task-123', 'user-9');

  const call = sinks.deleteTask.calls[0]!;
  assert.equal(call.id, 'task-123');
  assert.equal(call.userId, 'user-9');
  assert.equal(call.timezone, 'UTC');
});

test('resolveId falls back to the demo user when no userId is provided', async () => {
  const sinks = makeSinks();
  const controller = buildController(sinks);

  await controller.remove('task-123', undefined);
  assert.equal(sinks.deleteTask.calls[0]!.userId, 'demo-user');
});
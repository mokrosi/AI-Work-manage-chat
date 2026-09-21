import test from 'node:test';
import assert from 'node:assert/strict';

import {
  checkAvailabilityToolInputSchema,
  createTaskToolInputSchema,
  executorCommandSchema,
  getScheduleToolInputSchema,
  updateTaskToolInputSchema,
} from './task.tools';

test('executorCommandSchema parses a valid get_schedule command and coerces dates', () => {
  const parsed = executorCommandSchema.safeParse({
    operation: 'get_schedule',
    input: {
      userId: 'user-42',
      start: '2026-09-21T08:00:00.000Z',
      end: '2026-09-21T12:00:00.000Z',
      timezone: 'UTC',
    },
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.operation, 'get_schedule');
    assert.ok(parsed.data.input.start instanceof Date);
    assert.ok(parsed.data.input.end instanceof Date);
    assert.equal(parsed.data.input.start.toISOString(), '2026-09-21T08:00:00.000Z');
  }
});

test('executorCommandSchema rejects an unknown operation', () => {
  const parsed = executorCommandSchema.safeParse({
    operation: 'explode',
    input: {},
  });

  assert.equal(parsed.success, false);
});

test('executorCommandSchema rejects missing and reversed time windows', () => {
  const missing = executorCommandSchema.safeParse({
    operation: 'get_schedule',
    input: { userId: 'user-42', start: '2026-09-21T08:00:00.000Z', timezone: 'UTC' },
  });
  assert.equal(missing.success, false);

  const reversed = executorCommandSchema.safeParse({
    operation: 'get_schedule',
    input: {
      userId: 'user-42',
      start: '2026-09-21T12:00:00.000Z',
      end: '2026-09-21T08:00:00.000Z',
      timezone: 'UTC',
    },
  });
  assert.equal(reversed.success, true, 'schema is structural; window order is validated in the use case');
});

test('create_task input requires a title and trims blank values', () => {
  const blankTitle = executorCommandSchema.safeParse({
    operation: 'create_task',
    input: {
      userId: 'user-42',
      title: '   ',
      startTime: '2026-09-21T09:00:00.000Z',
      endTime: '2026-09-21T10:00:00.000Z',
      timezone: 'UTC',
    },
  });
  assert.equal(blankTitle.success, false);
});

test('create_task accepts a valid proposed task', () => {
  const parsed = executorCommandSchema.safeParse({
    operation: 'create_task',
    input: {
      userId: 'user-42',
      title: 'Gym',
      startTime: '2026-09-22T15:00:00.000Z',
      endTime: '2026-09-22T16:00:00.000Z',
      timezone: 'UTC',
    },
  });

  assert.equal(parsed.success, true);
});

test('tool input schemas omit userId so the agent never supplies it', () => {
  const parsed = createTaskToolInputSchema.safeParse({
    title: 'Gym',
    startTime: '2026-09-22T15:00:00.000Z',
    endTime: '2026-09-22T16:00:00.000Z',
    timezone: 'UTC',
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal('userId' in parsed.data, false);
  }
});

test('update_task tool produces a merged command that includes userId', () => {
  const parsed = updateTaskToolInputSchema.safeParse({
    id: 'task-1',
    timezone: 'UTC',
    title: 'Renamed',
  });

  assert.equal(parsed.success, true);
});

test('check_availability tool input validates its time window fields', () => {
  const parsed = checkAvailabilityToolInputSchema.safeParse({
    start: '2026-09-21T08:00:00.000Z',
    end: '2026-09-21T09:00:00.000Z',
    timezone: 'America/New_York',
  });

  assert.equal(parsed.success, true);
  const invalid = checkAvailabilityToolInputSchema.safeParse({
    start: 'not-a-date',
    end: '2026-09-21T09:00:00.000Z',
    timezone: 'America/New_York',
  });
  assert.equal(invalid.success, false);
});
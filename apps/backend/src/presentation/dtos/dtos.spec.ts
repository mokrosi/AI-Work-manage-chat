import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from 'class-validator';

import { TaskStatus } from '@domain/entities/task.entity';
import { CreateTaskDto } from './create-task.dto';
import { ScheduleQueryDto } from './schedule-query.dto';
import { ChatMessageDto } from './chat-message.dto';
import { ConfirmApprovalDto } from './confirm-approval.dto';
import { UpdateTaskDto } from './update-task.dto';

async function firstErrorFor(instance: object): Promise<string | undefined> {
  const errors = await validate(instance as never);
  return errors[0]?.constraints
    ? Object.values(errors[0].constraints)[0]
    : undefined;
}

test('CreateTaskDto accepts a valid payload', async () => {
  const dto = new CreateTaskDto();
  dto.title = 'Meeting';
  dto.startTime = '2026-09-21T09:00:00.000Z';
  dto.endTime = '2026-09-21T10:00:00.000Z';

  const errors = await validate(dto as never);
  assert.equal(errors.length, 0);
});

test('CreateTaskDto rejects a missing title', async () => {
  const dto = new CreateTaskDto();
  dto.startTime = '2026-09-21T09:00:00.000Z';
  dto.endTime = '2026-09-21T10:00:00.000Z';

  const error = await firstErrorFor(dto);
  assert.ok(error, 'expected a validation error');
});

test('CreateTaskDto rejects a malformed date string', async () => {
  const dto = new CreateTaskDto();
  dto.title = 'Meeting';
  dto.startTime = 'not-a-date';
  dto.endTime = '2026-09-21T10:00:00.000Z';

  const error = await firstErrorFor(dto);
  assert.match(error ?? '', /ISO 8601/);
});

test('CreateTaskDto rejects an unknown status enum value', async () => {
  const dto = new CreateTaskDto();
  dto.title = 'Meeting';
  dto.startTime = '2026-09-21T09:00:00.000Z';
  dto.endTime = '2026-09-21T10:00:00.000Z';
  dto.status = 'ARCHIVED' as TaskStatus;

  const error = await firstErrorFor(dto);
  assert.match(error ?? '', /following values/i);
});

test('UpdateTaskDto allows partial updates', async () => {
  const dto = new UpdateTaskDto();
  dto.status = TaskStatus.COMPLETED;

  const errors = await validate(dto as never);
  assert.equal(errors.length, 0);
});

test('ScheduleQueryDto accepts empty queries and rejects bad date ranges', async () => {
  const empty = new ScheduleQueryDto();
  assert.equal((await validate(empty as never)).length, 0);

  const bad = new ScheduleQueryDto();
  bad.from = 'soon';
  const error = await firstErrorFor(bad);
  assert.match(error ?? '', /ISO 8601/);
});

test('ChatMessageDto requires a non-empty message', async () => {
  const dto = new ChatMessageDto();
  dto.message = '';

  const error = await firstErrorFor(dto);
  assert.ok(error);
});

test('ConfirmApprovalDto requires a boolean approve flag', async () => {
  const dto = new ConfirmApprovalDto();
  dto.token = 'tok-1';
  dto.approve = 'yes' as never;

  const error = await firstErrorFor(dto);
  assert.match(error ?? '', /boolean/i);

  const valid = new ConfirmApprovalDto();
  valid.token = 'tok-1';
  valid.approve = true;
  assert.equal((await validate(valid as never)).length, 0);
});
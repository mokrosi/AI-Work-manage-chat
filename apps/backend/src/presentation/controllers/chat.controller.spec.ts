import test from 'node:test';
import assert from 'node:assert/strict';

import { ChatController } from './chat.controller';

const demoUser = { resolveId: async (userId?: string) => userId ?? 'demo-user' };

test('message delegates to the orchestrator with timezone and userId', async () => {
  const orchestrator = {
    handleMessage: async (...args: unknown[]) => {
      calls.push(args);
      return { type: 'message', text: 'hi', tools: [] };
    },
    confirm: async () => ({ type: 'cancelled' }),
  };
  const calls: unknown[][] = [];

  const controller = new ChatController(
    orchestrator as never,
    demoUser as never,
  );

  const result = await controller.message({
    message: 'What do I have tomorrow?',
    timezone: 'Asia/Muscat',
  });

  assert.deepEqual(result, { type: 'message', text: 'hi', tools: [] });
  assert.equal(calls.length, 1);
  const [message, timezone, userId] = calls[0] as [string, string, string];
  assert.equal(message, 'What do I have tomorrow?');
  assert.equal(timezone, 'Asia/Muscat');
  assert.equal(userId, 'demo-user');
});

test('message defaults the timezone to UTC and resolves the demo user', async () => {
  const orchestrator = {
    handleMessage: async (message: string, timezone: string, userId: string) => {
      captured = { message, timezone, userId };
      return { type: 'message', text: 'ok', tools: [] };
    },
    confirm: async () => ({ type: 'cancelled' }),
  };
  let captured: { message: string; timezone: string; userId: string } | undefined;

  const controller = new ChatController(orchestrator as never, demoUser as never);

  await controller.message({ message: 'Hello there' });

  assert.deepEqual(captured, {
    message: 'Hello there',
    timezone: 'UTC',
    userId: 'demo-user',
  });
});

test('confirm passes the token and decision to the orchestrator', async () => {
  const orchestrator = {
    handleMessage: async () => ({ type: 'message', text: '', tools: [] }),
    confirm: async (token: string, approve: boolean) => {
      captured = { token, approve };
      return { type: 'approved', data: { ok: true } };
    },
  };
  let captured: { token: string; approve: boolean } | undefined;

  const controller = new ChatController(orchestrator as never, demoUser as never);

  const result = await controller.confirm({ token: 'tok-1', approve: true });

  assert.deepEqual(result, { type: 'approved', data: { ok: true } });
  assert.deepEqual(captured, { token: 'tok-1', approve: true });
});

test('edit updates a pending approval through the orchestrator', async () => {
  let captured: { token: string; title: string; startTime: Date; endTime: Date } | undefined;
  const orchestrator = {
    handleMessage: async () => ({ type: 'message', text: '', tools: [] }),
    confirm: async () => ({ type: 'cancelled' }),
    editApproval: (token: string, values: { title: string; startTime: Date; endTime: Date }) => {
      captured = { token, ...values };
      return { token, operation: 'create_task', ...values };
    },
  };
  const controller = new ChatController(orchestrator as never, demoUser as never);

  const result = await controller.edit({
    token: 'tok-1',
    title: 'Updated task',
    startTime: '2026-09-22T15:00:00.000Z',
    endTime: '2026-09-22T16:00:00.000Z',
  });

  assert.equal(result.title, 'Updated task');
  assert.equal(captured?.token, 'tok-1');
  assert.equal(captured?.startTime.toISOString(), '2026-09-22T15:00:00.000Z');
});
import test from 'node:test';
import assert from 'node:assert/strict';

import { PendingApprovalStore } from './pending-approval.store';

const command = {
  title: 'Gym session',
  startTime: new Date('2026-09-22T15:00:00.000Z'),
  endTime: new Date('2026-09-22T16:00:00.000Z'),
  userId: 'user-1',
  timezone: 'UTC',
};

test('edits a pending approval before it is consumed', () => {
  const store = new PendingApprovalStore();
  const pending = store.create(command);

  const edited = store.edit(pending.token, {
    title: 'Long gym session',
    startTime: new Date('2026-09-22T17:00:00.000Z'),
    endTime: new Date('2026-09-22T18:30:00.000Z'),
  });

  assert.equal(edited.title, 'Long gym session');
  assert.equal(edited.startTime, '2026-09-22T17:00:00.000Z');
  assert.equal(edited.endTime, '2026-09-22T18:30:00.000Z');
  assert.equal(store.get(pending.token).command.title, 'Long gym session');
});

test('rejects an invalid edited approval window', () => {
  const store = new PendingApprovalStore();
  const pending = store.create(command);

  assert.throws(
    () => store.edit(pending.token, {
      title: 'Invalid',
      startTime: new Date('2026-09-22T18:00:00.000Z'),
      endTime: new Date('2026-09-22T17:00:00.000Z'),
    }),
    /valid time range/,
  );
});

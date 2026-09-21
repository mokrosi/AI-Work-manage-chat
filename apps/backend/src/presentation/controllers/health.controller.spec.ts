import test from 'node:test';
import assert from 'node:assert/strict';

import { HealthController } from './health.controller';

test('HealthController returns ok with an ISO timestamp', () => {
  const controller = new HealthController();
  const before = Date.now();
  const result = controller.getHealth();
  const after = Date.now();

  assert.equal(result.status, 'ok');
  const timestamp = new Date(result.timestamp).getTime();
  assert.ok(timestamp >= before && timestamp <= after);
  assert.match(result.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});
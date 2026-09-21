import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRuntimeContext,
  getOpenRouterHeaders,
  resolveModelConfig,
} from './openai-gateway';

test('resolveModelConfig prefers OpenRouter config and defaults to Gemini Flash', () => {
  const config = resolveModelConfig({
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_MODEL: 'google/gemini-1.5-flash:free',
    OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
    OPENROUTER_HTTP_REFERER: 'https://example.com',
    OPENROUTER_APP_TITLE: 'AI Task Manager',
  });

  assert.equal(config.apiKey, 'test-key');
  assert.equal(config.modelId, 'google/gemini-1.5-flash:free');
  assert.equal(config.baseUrl, 'https://openrouter.ai/api/v1');
  assert.equal(config.headers['HTTP-Referer'], 'https://example.com');
  assert.equal(config.headers['X-Title'], 'AI Task Manager');
});

test('buildRuntimeContext includes ISO time, timezone and day of week', () => {
  const context = buildRuntimeContext(new Date('2026-09-21T08:00:00Z'), 'Asia/Muscat');

  assert.match(context.timestampIso, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(context.timezone, 'Asia/Muscat');
  assert.equal(context.dayOfWeek, 'Monday');
});

test('getOpenRouterHeaders includes required provider headers', () => {
  const headers = getOpenRouterHeaders({
    HTTP_REFERER: 'https://example.com',
    APP_TITLE: 'AI Task Manager',
  });

  assert.equal(headers['HTTP-Referer'], 'https://example.com');
  assert.equal(headers['X-Title'], 'AI Task Manager');
});

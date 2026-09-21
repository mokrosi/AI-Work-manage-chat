import test from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, HttpStatus } from '@nestjs/common';

import { ApplicationError } from '@application/errors/application.error';
import { GlobalExceptionFilter } from './global-exception.filter';

interface MockResponse {
  status(code: number): MockResponse;
  json(body: unknown): MockResponse;
  _result(): { statusCode?: number; body?: unknown };
}

function mockHost(response: MockResponse) {
  return {
    switchToHttp: () => ({ getResponse: () => response }),
  } as never;
}

function makeResponse(): MockResponse {
  let statusCode: number | undefined;
  let body: unknown;

  const res: MockResponse = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (payload: unknown) => {
      body = payload;
      return res;
    },
    _result: () => ({ statusCode, body }),
  };
  return res;
}

function respond(filter: GlobalExceptionFilter, exception: unknown) {
  const res = makeResponse();
  filter.catch(exception, mockHost(res));
  return res._result() as { statusCode?: number; body: Record<string, unknown> };
}

test('maps ApplicationError codes to HTTP statuses', () => {
  const filter = new GlobalExceptionFilter();
  const cases: Array<[string, number]> = [
    ['TIME_CONFLICT', HttpStatus.CONFLICT],
    ['TASK_NOT_FOUND', HttpStatus.NOT_FOUND],
    ['INVALID_TIME_RANGE', HttpStatus.UNPROCESSABLE_ENTITY],
    ['INVALID_TIMEZONE', HttpStatus.BAD_REQUEST],
    ['APPROVAL_EXPIRED', HttpStatus.GONE],
    ['AI_NOT_CONFIGURED', HttpStatus.SERVICE_UNAVAILABLE],
    ['INVALID_COMMAND', HttpStatus.UNPROCESSABLE_ENTITY],
  ];

  for (const [code, expectedStatus] of cases) {
    const { statusCode, body } = respond(filter, new ApplicationError(code, 'boom'));
    assert.equal(statusCode, expectedStatus, `for code ${code}`);
    assert.equal(body.code, code);
    assert.equal(body.message, 'boom');
  }
});

test('falls back to 400 for unknown ApplicationError codes', () => {
  const filter = new GlobalExceptionFilter();
  const { statusCode, body } = respond(filter, new ApplicationError('WEIRD_CODE', 'weird'));
  assert.equal(statusCode, HttpStatus.BAD_REQUEST);
  assert.equal(body.code, 'WEIRD_CODE');
});

test('passes through HttpException responses unchanged', () => {
  const filter = new GlobalExceptionFilter();
  const { statusCode, body } = respond(
    filter,
    new BadRequestException({ message: 'Validation failed' }),
  );
  assert.equal(statusCode, HttpStatus.BAD_REQUEST);
  assert.deepEqual(body, { message: 'Validation failed' });
});

test('returns a generic 500 for unexpected errors', () => {
  const filter = new GlobalExceptionFilter();
  const { statusCode, body } = respond(filter, new TypeError('nope'));
  assert.equal(statusCode, HttpStatus.INTERNAL_SERVER_ERROR);
  assert.equal(body.code, 'INTERNAL_ERROR');
});

test('returns 504 for AI timeouts', () => {
  const filter = new GlobalExceptionFilter();
  const { statusCode, body } = respond(
    filter,
    new Error('Request timed out after 30000ms'),
  );
  assert.equal(statusCode, HttpStatus.GATEWAY_TIMEOUT);
  assert.equal(body.code, 'AI_TIMEOUT');
});
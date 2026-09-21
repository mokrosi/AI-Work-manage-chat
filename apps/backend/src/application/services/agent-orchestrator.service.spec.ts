import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ILlmGateway,
  LlmRunInput,
  LlmRunResult,
  LlmToolResult,
} from '@application/ports/llm.port';
import {
  CheckAvailabilityUseCase,
  CreateTaskUseCase,
  DeleteTaskUseCase,
  GetScheduleUseCase,
  UpdateTaskUseCase,
} from '@application/use-cases/task.use-cases';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { PendingApprovalStore } from './pending-approval.store';
import { TaskExecutorService } from './task-executor.service';
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

function makeRepository(overrides: Record<string, unknown> = {}) {
  const record: { scheduleUserId?: string } = {};
  const repo: Record<string, unknown> = {
    findTasksBetweenDates: async (userId: string) => {
      record.scheduleUserId = userId;
      return [makeTask()];
    },
    findTaskById: async () => makeTask(),
    findTasksByStatus: async () => [],
    createTask: async () => makeTask(),
    updateTask: async () => makeTask(),
    deleteTask: async () => makeTask(),
    checkTimeOverlap: async () => false,
    ...overrides,
    _record: record,
  };
  return repo;
}

function buildExecutor(repo: Record<string, unknown>): TaskExecutorService {
  return new TaskExecutorService(
    new GetScheduleUseCase(repo as never),
    new CheckAvailabilityUseCase(repo as never),
    new CreateTaskUseCase(repo as never),
    new UpdateTaskUseCase(repo as never),
    new DeleteTaskUseCase(repo as never),
  );
}

class StubGateway implements ILlmGateway {
  readonly calls: LlmRunInput[] = [];

  constructor(
    private readonly plan: Array<{ tool: string; args: Record<string, unknown> }>,
    private readonly text = 'Done',
  ) {}

  async run(input: LlmRunInput): Promise<LlmRunResult> {
    this.calls.push(input);

    const toolResults: LlmToolResult[] = [];
    for (const step of this.plan) {
      const tool = input.tools.find((t) => t.name === step.tool);
      if (!tool) continue;
      const parsedArgs = tool.inputSchema.parse(step.args);
      toolResults.push({
        name: tool.name,
        args: parsedArgs,
        output: await tool.execute(parsedArgs),
      });
    }

    return { text: this.text, toolResults };
  }
}

function buildOrchestrator(options: {
  gateway: ILlmGateway;
  repo: Record<string, unknown>;
  approvals?: PendingApprovalStore;
}) {
  return new AgentOrchestratorService(
    options.gateway,
    buildExecutor(options.repo),
    options.approvals ?? new PendingApprovalStore(),
  );
}

test('handleMessage returns a conversational reply when no tool needs approval', async () => {
  const repo = makeRepository();
  const gateway = new StubGateway([
    {
      tool: 'get_schedule',
      args: {
        start: '2026-09-21T08:00:00.000Z',
        end: '2026-09-21T12:00:00.000Z',
        timezone: 'UTC',
      },
    },
  ]);
  const orchestrator = buildOrchestrator({ gateway, repo });

  const result = await orchestrator.handleMessage(
    'What is on my calendar?',
    'Asia/Muscat',
    'user-42',
  );

  assert.equal(result.type, 'message');
  if (result.type === 'message') {
    assert.equal(result.text, 'Done');
    assert.deepEqual(result.tools, ['get_schedule']);
  }
});

test('handleMessage injects the userId before delegating tools to Agent 2', async () => {
  const repo = makeRepository();
  const gateway = new StubGateway([
    {
      tool: 'get_schedule',
      args: {
        start: '2026-09-21T08:00:00.000Z',
        end: '2026-09-21T12:00:00.000Z',
        timezone: 'UTC',
      },
    },
  ]);
  const orchestrator = buildOrchestrator({ gateway, repo });

  await orchestrator.handleMessage('Schedule?', 'UTC', 'user-42');

  assert.equal(
    (repo._record as { scheduleUserId?: string }).scheduleUserId,
    'user-42',
  );
});

test('handleMessage returns pending_approval when create_task is executed', async () => {
  const approvals = new PendingApprovalStore();
  const repo = makeRepository();
  const gateway = new StubGateway([
    {
      tool: 'create_task',
      args: {
        title: 'Gym',
        startTime: '2026-09-22T15:00:00.000Z',
        endTime: '2026-09-22T16:00:00.000Z',
        timezone: 'UTC',
      },
    },
  ]);
  const orchestrator = buildOrchestrator({ gateway, repo, approvals });

  const result = await orchestrator.handleMessage('Book a gym session', 'UTC', 'user-42');

  assert.equal(result.type, 'pending_approval');
  if (result.type === 'pending_approval') {
    assert.equal(result.approval.operation, 'create_task');
    assert.equal(result.approval.title, 'Gym');
    assert.equal(result.approval.startTime, '2026-09-22T15:00:00.000Z');
    assert.equal(result.approval.endTime, '2026-09-22T16:00:00.000Z');
    assert.equal(typeof result.approval.token, 'string');
    assert.deepEqual(result.tools, ['create_task']);

    const stored = approvals.get(result.approval.token);
    assert.equal(stored.command.userId, 'user-42');
  }
});

test('confirm(true) executes the deferred create_task and returns approved', async () => {
  const approvals = new PendingApprovalStore();
  const repo = makeRepository();
  let createdInput: Record<string, unknown> | undefined;
  repo.createTask = async (input: Record<string, unknown>) => {
    createdInput = input;
    return makeTask();
  };

  const gateway = new StubGateway([
    {
      tool: 'create_task',
      args: {
        title: 'Gym',
        startTime: '2026-09-22T15:00:00.000Z',
        endTime: '2026-09-22T16:00:00.000Z',
        timezone: 'UTC',
      },
    },
  ]);
  const orchestrator = buildOrchestrator({ gateway, repo, approvals });

  const pending = await orchestrator.handleMessage('Book a gym session', 'UTC', 'user-42');
  assert.equal(pending.type, 'pending_approval');
  if (pending.type !== 'pending_approval') return;

  const result = await orchestrator.confirm(pending.approval.token, true);

  assert.equal(result.type, 'approved');
  if (result.type === 'approved') {
    assert.equal((result.data as { ok: boolean }).ok, true);
  }

  assert.equal(createdInput?.title, 'Gym');
  assert.throws(() => approvals.get(pending.approval.token), /Approval not found/);
});

test('confirm(false) discards the pending change without creating a task', async () => {
  const approvals = new PendingApprovalStore();
  const repo = makeRepository();
  let created = false;
  repo.createTask = async () => {
    created = true;
    return makeTask();
  };

  const gateway = new StubGateway([
    {
      tool: 'create_task',
      args: {
        title: 'Gym',
        startTime: '2026-09-22T15:00:00.000Z',
        endTime: '2026-09-22T16:00:00.000Z',
        timezone: 'UTC',
      },
    },
  ]);
  const orchestrator = buildOrchestrator({ gateway, repo, approvals });

  const pending = await orchestrator.handleMessage('Book a gym session', 'UTC', 'user-42');
  if (pending.type !== 'pending_approval') {
    assert.fail('expected pending approval');
    return;
  }

  const result = await orchestrator.confirm(pending.approval.token, false);

  assert.deepEqual(result, { type: 'cancelled' });
  assert.equal(created, false);
  assert.throws(() => approvals.get(pending.approval.token), /Approval not found/);
});

test('confirm rejects an unknown token with APPROVAL_NOT_FOUND', async () => {
  const orchestrator = buildOrchestrator({
    gateway: new StubGateway([]),
    repo: makeRepository(),
  });

  await assert.rejects(
    () => orchestrator.confirm('missing-token', true),
    /Approval not found or expired/,
  );
});

test('handleMessage builds a system prompt that includes the user timezone', async () => {
  const gateway = new StubGateway([]);
  const orchestrator = buildOrchestrator({ gateway, repo: makeRepository() });

  await orchestrator.handleMessage('Hello', 'Asia/Muscat', 'user-42');

  assert.equal(gateway.calls.length, 1);
  const system = gateway.calls[0].system;
  assert.match(system, /Agent 1/);
  assert.match(system, /Asia\/Muscat/);
  assert.equal(gateway.calls[0].prompt, 'Hello');
  assert.equal(gateway.calls[0].maxSteps, 8);
});
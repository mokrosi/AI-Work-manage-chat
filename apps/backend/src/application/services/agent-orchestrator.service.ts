import { Inject, Injectable } from '@nestjs/common';
import { ILlmGateway, LlmTool } from '@application/ports/llm.port';
import { TaskExecutorService } from '@application/services/task-executor.service';
import { PendingApprovalStore, PendingApproval } from '@application/services/pending-approval.store';
import { CreateTaskCommand } from '@application/use-cases/task.use-cases';
import {
  checkAvailabilityToolInputSchema,
  createTaskToolInputSchema,
  deleteTaskToolInputSchema,
  getScheduleToolInputSchema,
  updateTaskToolInputSchema,
} from '@application/tools/task.tools';

export type ChatResult =
  | { type: 'message'; text: string; tools: string[] }
  | {
      type: 'pending_approval';
      tools: string[];
      approval: {
        token: string;
        operation: 'create_task';
        title: string;
        startTime: string;
        endTime: string;
      };
    };

export type ConfirmResult =
  | { type: 'approved'; data: unknown }
  | { type: 'cancelled' };

function formatClientTime(now: Date, timezone: string): {
  dateLine: string;
  timeLine: string;
} {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(now);
  } catch {
    timezone = 'UTC';
  }

  const dateLine = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const timeLine = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);

  return { dateLine, timeLine };
}

function buildSystemPrompt(timezone: string): string {
  const now = new Date();
  const { dateLine, timeLine } = formatClientTime(now, timezone);

  return [
    'You are Agent 1, The Communicator: a helpful personal assistant for a private work calendar.',
    `Today is ${dateLine}. The current local time is ${timeLine}. The user's timezone is ${timezone}.`,
    '',
    'The user keeps a calendar of tasks (meetings/events) with a start and end time.',
    '',
    'Rules:',
    '- To answer anything about the schedule, check availability, or create/update/delete an event, you MUST call the relevant tool (this delegates to Agent 2, the Executor). Never invent schedule data or dates yourself.',
    '- Interpret relative dates and times ("Sunday", "next week", "2pm") using the user\'s timezone and the current date/time provided above.',
    '- Use check_availability to ask whether a slot is free; use get_schedule to list what exists around a window.',
    '- To create an event, call create_task with a clear title and concrete startTime/endTime. A confirmation prompt will be shown to the user before it is saved, so describe the proposed event clearly.',
    '- update_task and delete_task take effect immediately; if the user asks to modify or remove something, confirm the details but do not ask for separate permission.',
    '- If the user is just chatting and no calendar action is needed, reply conversationally.',
    '- Be concise, friendly, and use the user\'s language when it is not English.',
  ].join('\n');
}

@Injectable()
export class AgentOrchestratorService {
  constructor(
    @Inject(ILlmGateway) private readonly llmGateway: ILlmGateway,
    private readonly executor: TaskExecutorService,
    private readonly approvals: PendingApprovalStore,
  ) {}

  private async runExecutor(operation: string, input: unknown): Promise<unknown> {
    const result = await this.executor.execute({ operation, input });
    return result;
  }

  private buildTools(userId: string): LlmTool[] {
    return [
      {
        name: 'get_schedule',
        description:
          'Returns the user\'s scheduled tasks that overlap a time window (start/end). Use to answer "what do I have on...".',
        inputSchema: getScheduleToolInputSchema,
        execute: (args) =>
          this.runExecutor('get_schedule', { userId, ...(args as object) }),
      },
      {
        name: 'check_availability',
        description:
          'Checks whether the user is free between start and end. Returns { available: boolean }. Use to answer "am I free at...".',
        inputSchema: checkAvailabilityToolInputSchema,
        execute: (args) =>
          this.runExecutor('check_availability', { userId, ...(args as object) }),
      },
      {
        name: 'create_task',
        description:
          'Proposes a new task. The user is shown a Confirm/Cancel prompt before it is saved, so do not assume it is saved.',
        inputSchema: createTaskToolInputSchema,
        execute: async (args) => {
          const input = { userId, ...(args as object) } as CreateTaskCommand;
          const approval = this.approvals.create(input);
          return { pendingApproval: true, ...approval };
        },
      },
      {
        name: 'update_task',
        description: 'Updates an existing task by its id.',
        inputSchema: updateTaskToolInputSchema,
        execute: (args) => {
          const input = { userId, ...(args as object) };
          return this.runExecutor('update_task', input);
        },
      },
      {
        name: 'delete_task',
        description: 'Deletes an existing task by its id.',
        inputSchema: deleteTaskToolInputSchema,
        execute: (args) =>
          this.runExecutor('delete_task', { userId, ...(args as object) }),
      },
    ];
  }

  async handleMessage(
    message: string,
    timezone: string,
    userId: string,
  ): Promise<ChatResult> {
    const system = buildSystemPrompt(timezone);
    const result = await this.llmGateway.run({
      system,
      prompt: message,
      tools: this.buildTools(userId),
      maxSteps: 6,
    });

    const pending = result.toolResults.find((r) => {
      if (r.name !== 'create_task' || !r.output || typeof r.output !== 'object') {
        return false;
      }
      return (r.output as { pendingApproval?: boolean }).pendingApproval === true;
    });

    if (pending) {
      const approval = pending.output as PendingApproval;
      return {
        type: 'pending_approval',
        tools: result.toolResults.map((r) => r.name),
        approval: {
          token: approval.token,
          operation: 'create_task',
          title: approval.title,
          startTime: approval.startTime,
          endTime: approval.endTime,
        },
      };
    }

    return {
      type: 'message',
      text: result.text,
      tools: result.toolResults.map((r) => r.name),
    };
  }

  async confirm(token: string, approve: boolean): Promise<ConfirmResult> {
    if (!approve) {
      this.approvals.consume(token);
      return { type: 'cancelled' };
    }

    const approval = this.approvals.consume(token);
    const data = await this.executor.execute({
      operation: 'create_task',
      input: approval.command,
    });
    return { type: 'approved', data };
  }
}

import { Injectable } from '@nestjs/common';
import { ApplicationError } from '@application/errors/application.error';
import { CreateTaskCommand } from '@application/use-cases/task.use-cases';

export interface PendingApproval {
  token: string;
  operation: 'create_task';
  command: CreateTaskCommand;
  title: string;
  startTime: string;
  endTime: string;
  expiresAt: Date;
}

/**
 * In-memory store for human-in-the-loop approvals (Task 7.2).
 * A create_task tool call does not persist immediately; the approval is
 * recorded here and only executed once the user confirms via the API.
 *
 * NOTE: in-memory by design for a single-instance dev server. Swap for Redis
 * if deployed across multiple instances.
 */
@Injectable()
export class PendingApprovalStore {
  private readonly approvals = new Map<string, PendingApproval>();
  private readonly ttlMs = 10 * 60 * 1000;

  private createToken(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  create(command: CreateTaskCommand): PendingApproval {
    const token = this.createToken();
    const approval: PendingApproval = {
      token,
      operation: 'create_task',
      command,
      title: command.title,
      startTime: command.startTime.toISOString(),
      endTime: command.endTime.toISOString(),
      expiresAt: new Date(Date.now() + this.ttlMs),
    };

    this.approvals.set(token, approval);
    return approval;
  }

  get(token: string): PendingApproval {
    const approval = this.approvals.get(token);
    if (!approval) {
      throw new ApplicationError('APPROVAL_NOT_FOUND', 'Approval not found or expired');
    }

    if (approval.expiresAt.getTime() < Date.now()) {
      this.approvals.delete(token);
      throw new ApplicationError('APPROVAL_EXPIRED', 'Approval has expired');
    }

    return approval;
  }

  consume(token: string): PendingApproval {
    const approval = this.get(token);
    this.approvals.delete(token);
    return approval;
  }
}

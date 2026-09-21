export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: TaskStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingApproval {
  token: string;
  operation: 'create_task';
  title: string;
  startTime: string;
  endTime: string;
}

export type ChatResponse =
  | { type: 'message'; text: string; tools: string[] }
  | {
      type: 'pending_approval';
      tools: string[];
      approval: PendingApproval;
    };

export type ConfirmResponse =
  | { type: 'approved'; data: unknown }
  | { type: 'cancelled' };
/**
 * Domain entity: Task
 *
 * Pure domain model, independent of the ORM. It only describes the
 * state and behavior required by the Application layer.
 */

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  /** UTC ISO-8601 timestamp. */
  startTime: Date;
  /** UTC ISO-8601 timestamp. Must be strictly greater than startTime. */
  endTime: Date;
  status: TaskStatus;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

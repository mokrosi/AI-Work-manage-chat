import { z } from 'zod';
import { TaskStatus } from '@domain/entities/task.entity';

const isoDate = z.coerce.date();
const userId = z.string().trim().min(1);
const timezone = z.string().trim().min(1);
const status = z.nativeEnum(TaskStatus);

const scheduleFields = {
  userId,
  start: isoDate,
  end: isoDate,
  timezone,
};

export const getScheduleToolSchema = z.object(scheduleFields);
export const checkAvailabilityToolSchema = z.object(scheduleFields);

export const createTaskToolSchema = z.object({
  userId,
  timezone,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  startTime: isoDate,
  endTime: isoDate,
  status: status.optional(),
});

export const updateTaskToolSchema = z.object({
  id: z.string().trim().min(1),
  userId,
  timezone,
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  startTime: isoDate.optional(),
  endTime: isoDate.optional(),
  status: status.optional(),
});

export const deleteTaskToolSchema = z.object({ id: z.string().trim().min(1), userId, timezone });

export const executorCommandSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('get_schedule'), input: getScheduleToolSchema }),
  z.object({ operation: z.literal('check_availability'), input: checkAvailabilityToolSchema }),
  z.object({ operation: z.literal('create_task'), input: createTaskToolSchema }),
  z.object({ operation: z.literal('update_task'), input: updateTaskToolSchema }),
  z.object({ operation: z.literal('delete_task'), input: deleteTaskToolSchema }),
]);

export type ExecutorCommand = z.infer<typeof executorCommandSchema>;

// Tool-facing schemas for Agent 1. `userId` is omitted because the agent does
// not know the user id; the orchestration layer injects it before execution.
export const getScheduleToolInputSchema = getScheduleToolSchema.omit({ userId: true });
export const checkAvailabilityToolInputSchema = checkAvailabilityToolSchema.omit({ userId: true });
export const createTaskToolInputSchema = createTaskToolSchema.omit({ userId: true });
export const updateTaskToolInputSchema = updateTaskToolSchema.omit({ userId: true });
export const deleteTaskToolInputSchema = deleteTaskToolSchema.omit({ userId: true });

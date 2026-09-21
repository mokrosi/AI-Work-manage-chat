import axios from 'axios';
import { ChatResponse, ConfirmResponse, PendingApproval, Task, TaskStatus } from './types';

export const api = axios.create({
  baseURL: '/api',
  timeout: 45_000,
});

export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

export async function fetchTasks(params: {
  from: string;
  to: string;
  timezone: string;
}): Promise<Task[]> {
  const { data } = await api.get<Task[]>('/tasks', { params });
  return data;
}

export async function createTask(body: {
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  status?: TaskStatus;
  timezone: string;
}): Promise<Task> {
  const { data } = await api.post<Task>('/tasks', body);
  return data;
}

export async function updateTask(
  id: string,
  body: Partial<Pick<Task, 'title' | 'description' | 'startTime' | 'endTime' | 'status'>> & {
    timezone: string;
  },
): Promise<Task> {
  const { data } = await api.put<Task>(`/tasks/${id}`, body);
  return data;
}

export async function deleteTask(id: string): Promise<Task> {
  const { data } = await api.delete<Task>(`/tasks/${id}`);
  return data;
}

export async function sendChat(body: {
  message: string;
  timezone: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/chat', body);
  return data;
}

export async function confirmApproval(body: {
  token: string;
  approve: boolean;
}): Promise<ConfirmResponse> {
  const { data } = await api.post<ConfirmResponse>('/chat/confirm', body);
  return data;
}

export async function editApproval(body: {
  token: string;
  title: string;
  startTime: string;
  endTime: string;
}): Promise<PendingApproval> {
  const { data } = await api.post<PendingApproval>('/chat/confirm/edit', body);
  return data;
}
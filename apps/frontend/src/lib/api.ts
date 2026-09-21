import axios from 'axios';
import { ChatResponse, ConfirmResponse, Task } from './types';

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

export async function sendChat(body: {
  message: string;
  timezone: string;
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
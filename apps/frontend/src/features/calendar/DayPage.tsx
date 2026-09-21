import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock3, Plus } from 'lucide-react';
import { Button } from '@ui/button';
import { Card, CardContent } from '@ui/card';
import { createTask, getUserTimezone, updateTask } from '@lib/api';
import type { Task, TaskStatus } from '@lib/types';
import { useTasks } from './useTasks';

function dayStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function dateInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
}

export function DayPage() {
  const [selectedDate, setSelectedDate] = useState(() => dayStart(new Date()));
  const start = dayStart(selectedDate);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const { data: tasks = [], isLoading, isError } = useTasks({ from: start, to: end });
  const queryClient = useQueryClient();
  const [quickTitle, setQuickTitle] = useState('');
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTask(id, { status, timezone: getUserTimezone() }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['tasks'] }); },
  });
  const createMutation = useMutation({
    mutationFn: (title: string) => createTask({ title, startTime: new Date(dateInput(start)).toISOString(), endTime: new Date(new Date(dateInput(start)).getTime() + 60 * 60 * 1000).toISOString(), timezone: getUserTimezone() }),
    onSuccess: () => { setQuickTitle(''); void queryClient.invalidateQueries({ queryKey: ['tasks'] }); },
  });
  const orderedTasks = useMemo(() => [...tasks].sort((a, b) => a.startTime.localeCompare(b.startTime)), [tasks]);
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
  const label = start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const isToday = start.getTime() === dayStart(new Date()).getTime();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-teal-700">{isToday ? 'Your focus for today' : 'Daily plan'}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{label}</h1><p className="mt-1 text-sm text-slate-500">{completed} of {tasks.length} tasks complete</p></div>
        <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous day" onClick={() => setSelectedDate(new Date(start.getTime() - 86400000))}><ArrowLeft /></Button><Button variant="outline" onClick={() => setSelectedDate(dayStart(new Date()))}>Today</Button><Button variant="outline" size="icon" aria-label="Next day" onClick={() => setSelectedDate(new Date(start.getTime() + 86400000))}><ArrowRight /></Button></div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border-slate-200/80 shadow-sm"><CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Agenda</p><p className="mt-1 text-sm text-slate-500">A clear, chronological view of your day</p></div><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span></div>
          {isLoading && <p className="py-12 text-center text-sm text-slate-400">Loading your day...</p>}
          {isError && <p className="py-12 text-center text-sm text-red-600">Could not load this day.</p>}
          {!isLoading && !isError && orderedTasks.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center"><p className="font-semibold text-slate-800">A blank page can be a good plan.</p><p className="mt-1 text-sm text-slate-500">Add one useful thing to get started.</p></div>}
          <div className="space-y-2">{orderedTasks.map((task) => <TaskRow key={task.id} task={task} onComplete={() => statusMutation.mutate({ id: task.id, status: task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' })} />)}</div>
        </CardContent></Card>
        <Card className="h-fit border-slate-200/80 bg-slate-950 text-white shadow-sm"><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Quick add</p><h2 className="mt-2 text-xl font-semibold">What needs a place?</h2><form className="mt-5 space-y-2" onSubmit={(event) => { event.preventDefault(); if (quickTitle.trim()) createMutation.mutate(quickTitle.trim()); }}><input value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="Task title" className="h-10 w-full rounded-md border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400" /><Button type="submit" disabled={!quickTitle.trim() || createMutation.isPending} className="w-full bg-teal-500 text-slate-950 hover:bg-teal-400"><Plus /> Add to day</Button></form><div className="mt-6 border-t border-white/10 pt-4 text-sm text-slate-300"><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-teal-300" /> Local time</p><p className="mt-1 text-xs text-slate-500">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p></div></CardContent></Card>
      </div>
    </div>
  );
}

function TaskRow({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const complete = task.status === 'COMPLETED';
  return <div className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${complete ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 bg-white hover:border-teal-200 hover:bg-teal-50/30'}`}><button type="button" aria-label={complete ? `Reopen ${task.title}` : `Complete ${task.title}`} onClick={onComplete} className={complete ? 'text-emerald-600' : 'text-slate-300 hover:text-teal-600'}>{complete ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</button><div className="min-w-0 flex-1"><p className={`font-medium ${complete ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.title}</p>{task.description && <p className="truncate text-xs text-slate-400">{task.description}</p>}</div><span className="shrink-0 text-xs text-slate-400">{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(task.startTime))}</span></div>;
}
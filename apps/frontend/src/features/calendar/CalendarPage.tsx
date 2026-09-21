import { useMemo, useState, type FormEvent } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, CheckCircle2, Clock3, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@ui/button';
import { Card, CardContent } from '@ui/card';
import { Input } from '@ui/input';
import { createTask, deleteTask, getUserTimezone, updateTask } from '@lib/api';
import type { Task, TaskStatus } from '@lib/types';
import { useTasks } from './useTasks';

// The bundled FullCalendar types for plugins disagree across packages; the
// values are correct at runtime, so assert the array loosely.
const plugins = [dayGridPlugin, timeGridPlugin] as any;

const statusLabels: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function toInputValue(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function taskToForm(task?: Task) {
  const start = task ? new Date(task.startTime) : new Date();
  const end = task ? new Date(task.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    startTime: toInputValue(start),
    endTime: toInputValue(end),
    status: task?.status ?? ('PENDING' as TaskStatus),
  };
}

export function CalendarPage() {
  const now = useMemo(() => new Date(), []);
  const [range, setRange] = useState({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  });

  const { data: tasks = [], isLoading, isError } = useTasks(range);
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [form, setForm] = useState(() => taskToForm());
  const [formError, setFormError] = useState<string | null>(null);
  const saveMutation = useMutation({
    mutationFn: (values: ReturnType<typeof taskToForm>) =>
      selectedTask
        ? updateTask(selectedTask.id, {
            ...values,
            description: values.description || null,
            startTime: new Date(values.startTime).toISOString(),
            endTime: new Date(values.endTime).toISOString(),
            timezone: getUserTimezone(),
          })
        : createTask({
            ...values,
            description: values.description || null,
            startTime: new Date(values.startTime).toISOString(),
            endTime: new Date(values.endTime).toISOString(),
            timezone: getUserTimezone(),
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditorOpen(false);
      setSelectedTask(undefined);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditorOpen(false);
      setSelectedTask(undefined);
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTask(id, { status, timezone: getUserTimezone() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.description?.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, tasks]);

  const events = useMemo(
    () =>
          filteredTasks.map((task) => ({
        id: task.id,
        title: task.title,
        start: task.startTime,
        end: task.endTime,
        backgroundColor:
          task.status === 'COMPLETED'
            ? 'rgb(22 163 74 / 0.85)'
            : task.status === 'CANCELLED'
              ? 'rgb(107 114 128 / 0.7)'
              : 'rgb(59 130 246 / 0.85)',
        borderColor: 'transparent',
      })),
    [filteredTasks],
  );

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const todayTasks = tasks.filter((task) => {
    const start = new Date(task.startTime);
    return start >= todayStart && start < tomorrowStart;
  });
  const overdueTasks = tasks.filter(
    (task) => new Date(task.endTime) < today && task.status !== 'COMPLETED' && task.status !== 'CANCELLED',
  );
  const upcomingTasks = [...filteredTasks]
    .filter((task) => task.status !== 'COMPLETED' && task.status !== 'CANCELLED')
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
    .slice(0, 5);

  function formatTaskTime(task: Task) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(task.startTime));
  }

  function openEditor(task?: Task) {
    setSelectedTask(task);
    setForm(taskToForm(task));
    setFormError(null);
    setEditorOpen(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError('Add a title so this task is easy to find.');
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setFormError('End time must be after the start time.');
      return;
    }
    setFormError(null);
    saveMutation.mutate(form);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
            <CalendarDays className="h-4 w-4" />
            Your schedule
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Make time for what matters.</h1>
          <p className="mt-1 text-sm text-slate-500">Plan, adjust, and close the loop on your day.</p>
        </div>
        <Button onClick={() => openEditor()}><Plus /> New task</Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <CardContent className="p-4 sm:p-6">
        <FullCalendar
          plugins={plugins}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          nowIndicator
          height="auto"
          events={events}
          eventClick={(info) => openEditor(tasks.find((task) => task.id === info.event.id))}
          datesSet={(info) =>
            setRange({ from: info.start, to: info.end })
          }
        />
        {isLoading && (
          <p className="mt-3 text-sm text-muted-foreground">Loading tasks…</p>
        )}
        {isError && (
          <p className="mt-3 text-sm text-red-600">
            Could not load tasks. Is the backend running?
          </p>
        )}
          </CardContent>
        </Card>
        <Card className="h-fit border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">At a glance</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xl font-semibold text-slate-950">{tasks.length}</p><p className="text-xs text-slate-500">Visible</p></div>
              <div className="rounded-lg bg-teal-50 p-3"><p className="text-xl font-semibold text-teal-800">{todayTasks.length}</p><p className="text-xs text-teal-700">Today</p></div>
              <div className="rounded-lg bg-amber-50 p-3"><p className="text-xl font-semibold text-amber-800">{overdueTasks.length}</p><p className="text-xs text-amber-700">Overdue</p></div>
            </div>
            <div className="mt-6 space-y-3 border-t border-slate-100 pt-4 text-sm">
              {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as TaskStatus[]).map((status) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600"><span className={`h-2 w-2 rounded-full ${status === 'COMPLETED' ? 'bg-emerald-500' : status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-teal-500'}`} />{statusLabels[status]}</span>
                  <span className="font-medium text-slate-900">{tasks.filter((task) => task.status === status).length}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Up next</p>
                <span className="text-xs text-slate-400">{upcomingTasks.length} shown</span>
              </div>
              <div className="mt-3 space-y-2">
                {upcomingTasks.length === 0 && <p className="text-xs leading-5 text-slate-400">Nothing matches this filter.</p>}
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="group flex items-start gap-2 rounded-lg p-2 transition-colors hover:bg-slate-50">
                    <button type="button" className="mt-0.5 text-slate-300 hover:text-teal-600" aria-label={`Complete ${task.title}`} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: task.id, status: 'COMPLETED' })}><CheckCircle2 className="h-4 w-4" /></button>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openEditor(task)}><p className="truncate text-sm font-medium text-slate-800">{task.title}</p><p className="text-xs text-slate-400">{formatTaskTime(task)}</p></button>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-6 text-xs leading-5 text-slate-400">Local time: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search tasks in this view" aria-label="Search tasks" />
        </div>
        <select aria-label="Filter tasks by status" className="h-10 rounded-md border border-input bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | TaskStatus)}>
          <option value="ALL">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {statusMutation.isError && <p className="text-sm text-red-600">Could not update that task. Please try again.</p>}
      {editorOpen && (
        <Card className="border-teal-200 bg-white shadow-lg shadow-teal-950/5">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{selectedTask ? 'Edit task' : 'New task'}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Keep the details useful.</h2>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close editor" onClick={() => setEditorOpen(false)}><X /></Button>
            </div>
            <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Title</span><Input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Deep work block" /></label>
              <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></span><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What should you remember?" /></label>
              <label><span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"><Clock3 className="h-3.5 w-3.5" />Starts</span><Input type="datetime-local" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
              <label><span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"><Clock3 className="h-3.5 w-3.5" />Ends</span><Input type="datetime-local" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
              <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {formError && <p className="self-end text-sm text-red-600 sm:col-span-2">{formError}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                {selectedTask ? <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={deleteMutation.isPending} onClick={() => { if (window.confirm('Delete this task?')) deleteMutation.mutate(selectedTask.id); }}><Trash2 /> Delete</Button> : <span />}
                <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button><Button type="submit" disabled={saveMutation.isPending}>{selectedTask ? <Pencil /> : <Check />}{saveMutation.isPending ? 'Saving...' : selectedTask ? 'Save changes' : 'Add task'}</Button></div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
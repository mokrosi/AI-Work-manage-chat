import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import 'fullcalendar/skeleton.css';
import 'fullcalendar/themes/classic/theme.css';
import 'fullcalendar/themes/classic/palette.css';
import { Card, CardContent } from '@ui/card';
import { useTasks } from './useTasks';

// The bundled FullCalendar types for plugins disagree across packages; the
// values are correct at runtime, so assert the array loosely.
const plugins = [dayGridPlugin, timeGridPlugin] as any;

export function CalendarPage() {
  const now = useMemo(() => new Date(), []);
  const [range, setRange] = useState({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  });

  const { data: tasks = [], isLoading, isError } = useTasks(range);

  const events = useMemo(
    () =>
      tasks.map((task) => ({
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
    [tasks],
  );

  return (
    <Card>
      <CardContent className="p-4">
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
        <p className="mt-3 text-xs text-muted-foreground">
          Times are shown in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
          Use the chat tab to have the AI add tasks — they appear here once approved.
        </p>
      </CardContent>
    </Card>
  );
}
import { useEffect, useState } from 'react';
import { Button } from '@ui/button';
import { Card, CardContent } from '@ui/card';
import type { PendingApproval } from '@lib/types';
import { formatRange } from './types';

interface ApprovalCardProps {
  approval: PendingApproval;
  status: 'pending' | 'processing' | 'approved' | 'cancelled';
  onResolve: (approve: boolean) => void;
  onEdit?: (values: { title: string; startTime: string; endTime: string }) => void;
  onViewCalendar?: () => void;
}

export function ApprovalCard({ approval, status, onResolve, onEdit, onViewCalendar }: ApprovalCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(approval.title);
  const [startTime, setStartTime] = useState(approval.startTime.slice(0, 16));
  const [endTime, setEndTime] = useState(approval.endTime.slice(0, 16));

  useEffect(() => {
    setTitle(approval.title);
    setStartTime(approval.startTime.slice(0, 16));
    setEndTime(approval.endTime.slice(0, 16));
  }, [approval]);

  return (
    <Card className="border-l-4 border-l-teal-500 shadow-sm">
      <CardContent className="space-y-3 pt-6">
        <div>
          <p className="text-sm font-semibold">The agent wants to create a task</p>
          {!editing && <p className="mt-2 text-sm">{approval.title}</p>}
          {editing && <input aria-label="Task title" className="mt-2 h-9 w-full rounded-md border px-3 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} />}
          {!editing && <p className="text-sm text-muted-foreground">{formatRange(approval.startTime, approval.endTime)}</p>}
          {editing && <div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Starts<input aria-label="Start time" type="datetime-local" className="mt-1 h-9 w-full rounded-md border px-2 text-sm text-foreground" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label className="text-xs text-muted-foreground">Ends<input aria-label="End time" type="datetime-local" className="mt-1 h-9 w-full rounded-md border px-2 text-sm text-foreground" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label></div>}
        </div>
        {status === 'approved' && (
          <p className="text-sm font-medium text-green-600">
            Approved — task added to your calendar.
          </p>
        )}
        {status === 'cancelled' && (
          <p className="text-sm font-medium text-muted-foreground">
            Cancelled — nothing was created.
          </p>
        )}
        {status === 'pending' && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onResolve(true)}>
              Confirm
            </Button>
            {onEdit && <Button size="sm" variant="outline" onClick={() => { if (editing) { onEdit({ title, startTime: new Date(startTime).toISOString(), endTime: new Date(endTime).toISOString() }); setEditing(false); } else setEditing(true); }}>
                {editing ? 'Save edit' : 'Edit'}
              </Button>}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve(false)}
            >
              Cancel
            </Button>
          </div>
        )}
        {status === 'approved' && onViewCalendar && <Button size="sm" variant="link" onClick={onViewCalendar}>View in Calendar</Button>}
        {status === 'processing' && (
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span className="text-sm text-muted-foreground">
              Agent 2 is executing…
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
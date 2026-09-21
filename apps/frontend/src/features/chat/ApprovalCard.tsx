import { Button } from '@ui/button';
import { Card, CardContent } from '@ui/card';
import type { PendingApproval } from '@lib/types';
import { formatRange } from './types';

interface ApprovalCardProps {
  approval: PendingApproval;
  status: 'pending' | 'processing' | 'approved' | 'cancelled';
  onResolve: (approve: boolean) => void;
}

export function ApprovalCard({ approval, status, onResolve }: ApprovalCardProps) {

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div>
          <p className="text-sm font-medium">The agent wants to create a task</p>
          <p className="mt-2 text-sm">{approval.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatRange(approval.startTime, approval.endTime)}
          </p>
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve(false)}
            >
              Cancel
            </Button>
          </div>
        )}
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
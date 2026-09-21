import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ApprovalCard } from './ApprovalCard';
import type { PendingApproval } from '@lib/types';

const approval: PendingApproval = {
  token: 'tok-1',
  operation: 'create_task',
  title: 'Gym session',
  startTime: '2026-09-22T15:00:00.000Z',
  endTime: '2026-09-22T16:00:00.000Z',
};

describe('ApprovalCard', () => {
  it('shows Confirm and Cancel while pending', () => {
    const onResolve = vi.fn();
    render(<ApprovalCard approval={approval} status="pending" onResolve={onResolve} />);

    expect(screen.getByText('The agent wants to create a task')).toBeInTheDocument();
    expect(screen.getByText('Gym session')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onResolve).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onResolve).toHaveBeenCalledWith(false);
  });

  it('shows the executing state while processing', () => {
    render(<ApprovalCard approval={approval} status="processing" onResolve={vi.fn()} />);
    expect(screen.getByText('Agent 2 is executing…')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows confirmation once approved', () => {
    render(<ApprovalCard approval={approval} status="approved" onResolve={vi.fn()} />);
    expect(
      screen.getByText('Approved — task added to your calendar.'),
    ).toBeInTheDocument();
  });

  it('shows a cancellation notice once cancelled', () => {
    render(<ApprovalCard approval={approval} status="cancelled" onResolve={vi.fn()} />);
    expect(screen.getByText('Cancelled — nothing was created.')).toBeInTheDocument();
  });

  it('renders the formatted date range', () => {
    render(<ApprovalCard approval={approval} status="pending" onResolve={vi.fn()} />);
    const range = screen.getByText(/, .*–.*/);
    expect(range.textContent).toMatch(/–/);
  });

  afterEach(() => cleanup());
});
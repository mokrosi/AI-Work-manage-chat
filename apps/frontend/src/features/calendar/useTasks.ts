import { useQuery } from '@tanstack/react-query';
import { fetchTasks, getUserTimezone } from '@lib/api';

export interface CalendarScope {
  from: Date;
  to: Date;
}

export function useTasks(scope: CalendarScope) {
  const timezone = getUserTimezone();
  return useQuery({
    queryKey: [
      'tasks',
      {
        from: scope.from.toISOString(),
        to: scope.to.toISOString(),
        timezone,
      },
    ],
    queryFn: () =>
      fetchTasks({
        from: scope.from.toISOString(),
        to: scope.to.toISOString(),
        timezone,
      }),
    placeholderData: (prev) => prev,
  });
}
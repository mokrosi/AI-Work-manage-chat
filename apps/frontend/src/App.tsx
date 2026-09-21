import { useState } from 'react';
import { ChatPage } from '@/features/chat/ChatPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { cn } from '@/lib/utils';

type View = 'chat' | 'calendar';

export default function App() {
  const [view, setView] = useState<View>('chat');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4">
          <span className="mr-6 text-sm font-semibold tracking-tight">
            AI Task Management
          </span>
          <NavButton active={view === 'chat'} onClick={() => setView('chat')}>
            Chat
          </NavButton>
          <NavButton
            active={view === 'calendar'}
            onClick={() => setView('calendar')}
          >
            Calendar
          </NavButton>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {view === 'chat' ? <ChatPage /> : <CalendarPage />}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  );
}

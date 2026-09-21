import { useState } from 'react';
import { Bot, CalendarDays } from 'lucide-react';
import { ChatPage } from '@/features/chat/ChatPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { cn } from '@/lib/utils';

type View = 'chat' | 'calendar';

export default function App() {
  const [view, setView] = useState<View>('chat');

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white"><Bot className="h-4 w-4" /></span>
            AI Task Management
          </span>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <NavButton active={view === 'chat'} onClick={() => setView('chat')}>
            <Bot className="h-4 w-4" /> Chat
          </NavButton>
          <NavButton
            active={view === 'calendar'}
            onClick={() => setView('calendar')}
          >
            <CalendarDays className="h-4 w-4" /> Calendar
          </NavButton>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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
        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  );
}

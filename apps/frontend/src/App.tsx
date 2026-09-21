import { useState } from 'react';
import { Bot, CalendarDays, CheckSquare, Sparkles } from 'lucide-react';
import { ChatPage } from '@/features/chat/ChatPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { DayPage } from '@/features/calendar/DayPage';
import { cn } from '@/lib/utils';

type View = 'chat' | 'day' | 'calendar';

export default function App() {
  const [view, setView] = useState<View>('chat');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <nav className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button type="button" onClick={() => setView('chat')} className="flex items-center gap-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm"><Sparkles className="h-4 w-4" /></span>
            <span><span className="block text-sm font-bold tracking-tight text-slate-950">Taskminder</span><span className="hidden text-xs text-slate-400 sm:block">Make room for what matters</span></span>
          </button>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
            <NavButton active={view === 'chat'} onClick={() => setView('chat')}><Bot className="h-4 w-4" /> Chat</NavButton>
            <NavButton active={view === 'day'} onClick={() => setView('day')}><CheckSquare className="h-4 w-4" /> Today</NavButton>
            <NavButton active={view === 'calendar'} onClick={() => setView('calendar')}><CalendarDays className="h-4 w-4" /> Calendar</NavButton>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {view === 'chat' ? <ChatPage /> : view === 'day' ? <DayPage /> : <CalendarPage />}
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

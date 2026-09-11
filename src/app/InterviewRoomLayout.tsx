import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/ui';

/**
 * Deliberately minimal — no sidebar/topbar, no recruiter-facing data or components.
 * Candidates reach this layout via a token-scoped link only; nothing here should ever
 * import from recruiter feature folders.
 */
export function InterviewRoomLayout() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="h-16 flex items-center px-6 border-b border-ink-100">
        <Logo size={28} />
      </header>
      <main className="flex-1 grid place-items-center px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

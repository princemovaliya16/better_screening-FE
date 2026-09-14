import { clsx } from 'clsx';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { CompanySettingsTab } from './CompanySettingsTab';
import { EmailSettingsTab } from './EmailSettingsTab';
import { NotificationSettingsTab } from './NotificationSettingsTab';
import { TeamSettingsTab } from './TeamSettingsTab';

type TabKey = 'company' | 'email' | 'notifications' | 'team';

const VALID_TABS: TabKey[] = ['company', 'email', 'notifications', 'team'];

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  // The Gmail "Connect" OAuth flow round-trips through Google and lands back here via
  // a full page redirect (?tab=email&gmail=connected) — the initial tab has to honor
  // that, since there's no in-app navigation state to fall back on.
  const initialTab = VALID_TABS.includes(searchParams.get('tab') as TabKey)
    ? (searchParams.get('tab') as TabKey)
    : 'company';
  const [tab, setTab] = useState<TabKey>(initialTab);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'company', label: 'Company & AI' },
    { key: 'email', label: 'Email & Gmail' },
    { key: 'notifications', label: 'Notifications' },
    ...(isAdmin ? [{ key: 'team' as const, label: 'Team' }] : []),
  ];

  return (
    <div className="p-6 max-w-[1000px] mx-auto">
      <h1 className="font-extrabold text-[26px] text-ink-900">Settings</h1>
      <p className="text-[15px] text-ink-500 mt-1 mb-6">
        Manage your organization, AI defaults, notifications, and team.
      </p>

      <div className="flex gap-1 border-b border-ink-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'px-4 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'company' && <CompanySettingsTab />}
      {tab === 'email' && <EmailSettingsTab />}
      {tab === 'notifications' && <NotificationSettingsTab />}
      {tab === 'team' && isAdmin && <TeamSettingsTab />}
    </div>
  );
}

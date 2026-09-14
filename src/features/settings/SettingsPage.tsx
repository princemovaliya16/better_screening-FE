import { clsx } from 'clsx';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AiSettingsTab } from './AiSettingsTab';
import { CompanySettingsTab } from './CompanySettingsTab';
import { EmailSettingsTab } from './EmailSettingsTab';
import { NotificationSettingsTab } from './NotificationSettingsTab';
import { TeamSettingsTab } from './TeamSettingsTab';

type TabKey = 'company' | 'email' | 'ai' | 'notifications' | 'team';

const VALID_TABS: TabKey[] = ['company', 'email', 'ai', 'notifications', 'team'];

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

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'company', label: 'Company', icon: '🏢' },
    { key: 'email', label: 'Email & Gmail', icon: '✉️' },
    { key: 'ai', label: 'AI settings', icon: '✨' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
    ...(isAdmin ? [{ key: 'team' as const, label: 'Team', icon: '👥' }] : []),
  ];

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <h1 className="font-display font-extrabold text-[26px] text-ink-900">Settings</h1>
      <p className="text-[15px] text-ink-500 mt-1 mb-6">
        Manage your account, integrations, and AI preferences.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium whitespace-nowrap transition-colors shrink-0',
                tab === t.key ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100',
              )}
            >
              <span className="text-[15px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {tab === 'company' && <CompanySettingsTab />}
          {tab === 'email' && <EmailSettingsTab />}
          {tab === 'ai' && <AiSettingsTab />}
          {tab === 'notifications' && <NotificationSettingsTab />}
          {tab === 'team' && isAdmin && <TeamSettingsTab />}
        </div>
      </div>
    </div>
  );
}

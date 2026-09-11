import { clsx } from 'clsx';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CompanySettingsTab } from './CompanySettingsTab';
import { NotificationSettingsTab } from './NotificationSettingsTab';
import { TeamSettingsTab } from './TeamSettingsTab';

type TabKey = 'company' | 'notifications' | 'team';

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<TabKey>('company');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'company', label: 'Company & AI' },
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
      {tab === 'notifications' && <NotificationSettingsTab />}
      {tab === 'team' && isAdmin && <TeamSettingsTab />}
    </div>
  );
}

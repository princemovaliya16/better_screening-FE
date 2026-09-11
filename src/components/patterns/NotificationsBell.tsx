import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/context/OrgContext';
import { notificationsApi } from '@/lib/api/notifications.api';
import { queryKeys } from '@/lib/api/queryKeys';

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NotificationsBell() {
  const { organization } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unread } = useQuery({
    queryKey: queryKeys.notificationsUnreadCount(organization?.id ?? ''),
    queryFn: notificationsApi.unreadCount,
    enabled: !!organization,
    refetchInterval: 20_000,
  });

  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications(organization?.id ?? ''),
    queryFn: () => notificationsApi.list(),
    enabled: !!organization && open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications(organization?.id ?? '') });
    queryClient.invalidateQueries({
      queryKey: queryKeys.notificationsUnreadCount(organization?.id ?? ''),
    });
  };

  const markReadMutation = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: invalidate });
  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: invalidate,
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const count = unread?.count ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 grid place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition-colors"
        aria-label="Notifications"
      >
        🔔
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-xl border border-ink-200/60 shadow-xl z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-ink-100">
            <span className="font-semibold text-[13px] text-ink-800">Notifications</span>
            {count > 0 && (
              <button
                className="text-[12px] text-brand-600 font-medium hover:text-brand-700"
                onClick={() => markAllReadMutation.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {!notifications || notifications.length === 0 ? (
              <p className="text-[13px] text-ink-400 p-4 text-center">You're all caught up.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.readAt) markReadMutation.mutate(n.id);
                    setOpen(false);
                    if (n.link) navigate(n.link);
                  }}
                  className="w-full text-left p-3 border-b border-ink-50 hover:bg-ink-50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />}
                    <div className={n.readAt ? 'opacity-60' : ''}>
                      <p className="text-[13px] font-medium text-ink-800">{n.title}</p>
                      {n.body && <p className="text-[12px] text-ink-500 mt-0.5">{n.body}</p>}
                      <p className="text-[11px] text-ink-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

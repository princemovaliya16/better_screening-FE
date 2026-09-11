import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { ApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';
import type { UserRole, UserStatus } from '@/lib/api/types';
import { usersApi } from '@/lib/api/users.api';
import { InviteMemberModal } from './InviteMemberModal';

const STATUS_TONE: Record<UserStatus, 'green' | 'amber' | 'slate'> = {
  active: 'green',
  invited: 'amber',
  disabled: 'slate',
};

export function TeamSettingsTab() {
  const { organization } = useOrg();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: members } = useQuery({
    queryKey: queryKeys.teamMembers(organization?.id ?? ''),
    queryFn: usersApi.list,
    enabled: !!organization,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.teamMembers(organization?.id ?? '') });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Something went wrong.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Something went wrong.'),
  });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-ink-900 text-lg">Team members</h2>
        <Button variant="ai" size="sm" onClick={() => setInviteOpen(true)}>
          + Invite
        </Button>
      </div>
      {error && <p className="text-[13px] text-rose-500 mb-3">{error}</p>}
      <div className="space-y-2">
        {members?.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 p-3 flex-wrap"
          >
            <div>
              <p className="font-semibold text-[14px] text-ink-900">
                {m.name} {m.id === user?.id && <span className="text-ink-400 font-normal">(you)</span>}
              </p>
              <p className="text-[12px] text-ink-500">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
              <select
                className="h-8 px-2 rounded-lg border border-ink-200 bg-white text-[13px]"
                value={m.role}
                disabled={roleMutation.isPending}
                onChange={(e) => roleMutation.mutate({ id: m.id, role: e.target.value as UserRole })}
              >
                <option value="admin">Admin</option>
                <option value="recruiter">Recruiter</option>
              </select>
              <Button
                size="sm"
                variant="secondary"
                className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
                disabled={m.id === user?.id}
                loading={removeMutation.isPending}
                onClick={() => confirm(`Remove ${m.name} from the team?`) && removeMutation.mutate(m.id)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {members?.length === 0 && <p className="text-sm text-ink-400">No team members yet.</p>}
      </div>
      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </Card>
  );
}

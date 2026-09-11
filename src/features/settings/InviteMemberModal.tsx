import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Field, Input, Modal, Select } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { authApi } from '@/lib/api/auth.api';
import { ApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';
import type { UserRole } from '@/lib/api/types';

export function InviteMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { organization } = useOrg();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('recruiter');

  const mutation = useMutation({
    mutationFn: () => authApi.invite(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teamMembers(organization?.id ?? '') });
      setEmail('');
      setRole('recruiter');
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Invite a team member" size="sm">
      <div className="p-5 space-y-4">
        <Field label="Email">
          <Input
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="recruiter">Recruiter</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        {mutation.isError && (
          <p className="text-[13px] text-rose-500">
            {mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong.'}
          </p>
        )}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="ai"
            disabled={!email.trim()}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Send invite
          </Button>
        </div>
      </div>
    </Modal>
  );
}

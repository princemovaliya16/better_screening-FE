import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Field, Input, Modal, Select } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import type { Candidate } from '@/lib/api/candidates.types';
import { ApiError } from '@/lib/api/client';
import { interviewsApi } from '@/lib/api/interviews.api';

export function ScheduleInterviewModal({
  open,
  onClose,
  candidate,
  defaultRoundIndex,
}: {
  open: boolean;
  onClose: () => void;
  candidate: Candidate;
  defaultRoundIndex?: number;
}) {
  const { organization } = useOrg();
  const queryClient = useQueryClient();
  const rounds = candidate.job?.rounds ?? [];

  const [roundIndex, setRoundIndex] = useState(defaultRoundIndex ?? 0);
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [time, setTime] = useState('11:00');
  const [duration, setDuration] = useState(rounds[roundIndex]?.durationMinutes ?? 30);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      interviewsApi.schedule({
        candidateId: candidate.id,
        roundIndex,
        scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
        durationMinutes: duration,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'interviews'] });
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'candidates', candidate.id] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Schedule interview" size="md">
      <div className="p-5 space-y-4">
        <Field label="Interview round">
          <Select
            value={roundIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setRoundIndex(idx);
              setDuration(rounds[idx]?.durationMinutes ?? 30);
            }}
          >
            {rounds.map((r, i) => (
              <option key={r.id} value={i}>
                Round {i + 1} — {r.name} ({r.type.replace('_', ' ')})
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Duration (minutes)">
          <Input
            type="number"
            min={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </Field>
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="ai"
            loading={mutation.isPending}
            disabled={rounds.length === 0}
            onClick={() => mutation.mutate()}
          >
            Schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
}

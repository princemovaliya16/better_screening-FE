import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Input, Select } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { candidatesApi } from '@/lib/api/candidates.api';
import { CANDIDATE_STAGE_LABELS, type CandidateStage } from '@/lib/api/candidates.types';
import { queryKeys } from '@/lib/api/queryKeys';
import { AddCandidateModal } from './AddCandidateModal';

const STAGE_TONE: Record<CandidateStage, 'sky' | 'amber' | 'brand' | 'violet' | 'fuchsia' | 'green' | 'rose'> = {
  applied: 'sky',
  screening: 'amber',
  interview: 'brand',
  hr_review: 'violet',
  offer: 'fuchsia',
  hired: 'green',
  rejected: 'rose',
};

export function CandidatesListPage() {
  const { organization } = useOrg();
  const [stage, setStage] = useState<CandidateStage | ''>('');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const filters = { stage: stage || undefined, search: search || undefined };
  const { data: candidates, isLoading } = useQuery({
    queryKey: queryKeys.candidates(organization?.id ?? '', filters),
    queryFn: () => candidatesApi.list(filters),
    enabled: !!organization,
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-extrabold text-[26px] text-ink-900">Candidates</h1>
          <p className="text-[15px] text-ink-500 mt-1">
            {candidates?.length ?? 0} candidates across your pipeline.
          </p>
        </div>
        <Button variant="ai" onClick={() => setAddOpen(true)}>
          + Add candidate
        </Button>
      </div>

      <div className="flex flex-wrap gap-2.5 mb-4">
        <div className="w-56">
          <Input
            placeholder="Search candidates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select value={stage} onChange={(e) => setStage(e.target.value as CandidateStage | '')}>
            <option value="">All stages</option>
            {(Object.keys(CANDIDATE_STAGE_LABELS) as CandidateStage[]).map((s) => (
              <option key={s} value={s}>
                {CANDIDATE_STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-ink-500">Loading…</p>
        ) : !candidates || candidates.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-500">
            No candidates found. Try adjusting filters, or add a new candidate.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] font-semibold text-ink-400 border-b border-ink-100">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="py-3">Applied job</th>
                  <th className="py-3">Experience</th>
                  <th className="py-3">Stage</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-ink-900">{c.name}</p>
                      <p className="text-[12px] text-ink-400">{c.email}</p>
                    </td>
                    <td className="py-3 text-ink-600">{c.job?.title ?? '—'}</td>
                    <td className="py-3 text-ink-600">
                      {c.experienceYears != null ? `${c.experienceYears} yrs` : '—'}
                    </td>
                    <td className="py-3">
                      <Badge tone={STAGE_TONE[c.stage]} dot>
                        {CANDIDATE_STAGE_LABELS[c.stage]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/app/candidates/${c.id}`}>
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddCandidateModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  IconBriefcase,
  IconClock,
  IconDotsVertical,
  IconLayers,
  IconMapPin,
} from '@/components/ui';
import { initialsOf, paletteFor } from '@/lib/avatar';
import type { JobListItem, JobStatus } from '@/lib/api/jobs.types';

const STATUS_TONE: Record<JobStatus, 'green' | 'amber' | 'slate'> = {
  open: 'green',
  draft: 'amber',
  closed: 'slate',
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

export function JobCard({
  job,
  onDelete,
  onPost,
  posting = false,
}: {
  job: JobListItem;
  onDelete: (job: JobListItem) => void;
  onPost: (job: JobListItem) => void;
  posting?: boolean;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const roundsCount = job.rounds.length;
  const iconTone = paletteFor(job.department);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <Card className="p-4.5 flex flex-col hover:shadow-md hover:border-ink-300/70 transition-all relative">
      <div className="flex items-start justify-between mb-3">
        <div
          className={clsx('w-10 h-10 rounded-xl grid place-items-center text-white shrink-0', iconTone.bg)}
        >
          <IconBriefcase className="w-5 h-5" />
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 grid place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label="Job actions"
          >
            <IconDotsVertical className="w-4.5 h-4.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 w-36 bg-white rounded-xl border border-ink-200 shadow-lg py-1 z-10 text-[13px]">
              <button
                type="button"
                onClick={() => navigate(`/app/jobs/${job.id}`)}
                className="w-full text-left px-3 py-2 hover:bg-ink-50 text-ink-700"
              >
                View
              </button>
              {job.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onPost(job);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-ink-50 text-ink-700 font-medium"
                >
                  Post job
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/app/jobs/${job.id}/edit`)}
                className="w-full text-left px-3 py-2 hover:bg-ink-50 text-ink-700"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(job);
                }}
                className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <Link to={`/app/jobs/${job.id}`} className="block flex-1">
        <h3 className="font-bold text-[15px] text-ink-900 truncate">{job.title}</h3>
        <span
          className={clsx(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium mt-1.5 mb-2.5',
            iconTone.tint,
          )}
        >
          {job.department}
        </span>
        <p className="text-[13px] text-ink-500 leading-snug line-clamp-2 min-h-[2.5em]">
          {job.description || 'No description provided.'}
        </p>

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-3 text-[12.5px] text-ink-500">
          <span className="inline-flex items-center gap-1">
            <IconMapPin className="w-3.5 h-3.5 text-ink-400" />
            {job.location ?? 'Remote'}
          </span>
          <span className="inline-flex items-center gap-1">
            <IconClock className="w-3.5 h-3.5 text-ink-400" />
            {EMPLOYMENT_LABEL[job.employmentType] ?? job.employmentType}
          </span>
          <span className="inline-flex items-center gap-1">
            <IconLayers className="w-3.5 h-3.5 text-ink-400" />
            {roundsCount} {roundsCount === 1 ? 'round' : 'rounds'}
          </span>
        </div>
      </Link>

      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-ink-100">
        {job.applicantsCount > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {job.recentApplicants.map((a) => {
                const c = paletteFor(a.id);
                return (
                  <div
                    key={a.id}
                    title={a.name}
                    className={clsx(
                      'w-6 h-6 rounded-full grid place-items-center text-white text-[10px] font-bold ring-2 ring-white',
                      c.bg,
                    )}
                  >
                    {initialsOf(a.name)}
                  </div>
                );
              })}
            </div>
            <span className="text-[12.5px] font-medium text-ink-600">
              {job.applicantsCount} applicant{job.applicantsCount === 1 ? '' : 's'}
            </span>
          </div>
        ) : (
          <span className="text-[12.5px] text-ink-400">0 applicants</span>
        )}
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[job.status]} dot>
            {job.status}
          </Badge>
          {job.status === 'draft' && (
            <Button size="sm" loading={posting} onClick={() => onPost(job)}>
              Post job
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

import { clsx } from 'clsx';
import { Card } from '@/components/ui';
import type { InterviewRecording } from '@/lib/api/interviews.types';

const PLAYABLE = new Set(['uploaded', 'transcribed', 'scored']);

function isPlayable(recording: InterviewRecording): boolean {
  return PLAYABLE.has(recording.status) && !!recording.playbackUrl;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function statusNote(recording: InterviewRecording): string {
  switch (recording.status) {
    case 'recording':
    case 'processing':
      return 'Processing recording…';
    case 'failed':
      return 'Recording failed';
    case 'not_recorded':
      return 'Not answered';
    default:
      return 'Recording unavailable';
  }
}

/** The selected answer's transcript, or where it is in the transcription pipeline. */
function transcriptNote(recording: InterviewRecording): string {
  if (recording.transcriptionStatus === 'completed' || recording.transcriptText != null) {
    return recording.transcriptText?.trim() || 'No speech was detected in this answer.';
  }
  if (recording.transcriptionStatus === 'pending') return 'Transcribing…';
  if (recording.transcriptionStatus === 'failed') {
    return `Transcription failed${recording.transcriptionError ? `: ${recording.transcriptionError}` : '.'}`;
  }
  if (recording.status === 'not_recorded') return 'This question was not answered.';
  return 'The transcript will appear once the candidate submits the interview.';
}

/**
 * Per-question playback of the candidate's LiveKit recordings. Signed URLs are
 * short-lived, so a playback error asks the parent to refetch fresh ones.
 */
export function RecordingPlayer({
  recordings,
  isLoading,
  selectedQuestionId,
  onSelect,
  onUrlExpired,
}: {
  recordings: InterviewRecording[] | undefined;
  isLoading: boolean;
  selectedQuestionId: string | null;
  onSelect: (questionId: string) => void;
  onUrlExpired: () => void;
}) {
  const list = recordings ?? [];
  const selected =
    list.find((r) => r.questionId === selectedQuestionId) ?? list.find(isPlayable) ?? list[0];

  return (
    <Card className="overflow-hidden border-ink-900/20">
      <div className="relative aspect-[16/9] bg-[radial-gradient(circle_at_30%_20%,#241b56,#120f2b)]">
        {selected && isPlayable(selected) ? (
          <video
            key={selected.questionId}
            src={selected.playbackUrl!}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full bg-black"
            onError={onUrlExpired}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center px-6">
            <p className="text-white/70 text-[13px]">
              {isLoading
                ? 'Loading recordings…'
                : selected
                  ? statusNote(selected)
                  : 'No recordings for this interview.'}
            </p>
          </div>
        )}
      </div>
      {selected && (
        <div className="px-4 py-3 bg-[#141032]">
          <p className="text-white text-[13px] font-semibold truncate">
            Q{selected.orderIndex + 1}. {selected.questionText}
          </p>
          {list.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {list.map((r, i) => (
                <button
                  key={r.questionId}
                  type="button"
                  onClick={() => onSelect(r.questionId)}
                  className={clsx(
                    'h-7 px-2.5 rounded-md text-[12px] font-medium tabular-nums transition-colors',
                    r.questionId === selected.questionId
                      ? 'bg-white text-ink-900'
                      : 'bg-white/10 text-white/70 hover:bg-white/20',
                    !isPlayable(r) && 'opacity-60',
                  )}
                  title={isPlayable(r) ? r.questionText : statusNote(r)}
                >
                  Q{i + 1}
                  {r.durationSeconds != null && ` · ${formatDuration(r.durationSeconds)}`}
                  {r.status === 'failed' && ' ⚠'}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 rounded-lg bg-white/[0.06] px-3 py-2.5">
            <p className="text-[10.5px] font-semibold tracking-wide text-white/45 mb-1">TRANSCRIPT</p>
            <p className="text-[13px] leading-relaxed text-white/85">{transcriptNote(selected)}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

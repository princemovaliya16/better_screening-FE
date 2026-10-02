import { Badge, Ring } from '@/components/ui';
import {
  RECOMMENDATION_LABELS,
  SCORE_DIMENSIONS,
  SCORE_LABELS,
  type EvaluationRecommendation,
  type InterviewSummary,
  type SpeechMetricsValues,
} from '@/lib/api/evaluation.types';

const RECOMMENDATION_TONE: Record<EvaluationRecommendation, 'green' | 'brand' | 'amber' | 'rose'> = {
  strong_hire: 'green',
  hire: 'brand',
  no_hire: 'amber',
  strong_no_hire: 'rose',
};

function scoreBarColor(value: number): string {
  if (value < 50) return 'bg-rose-400';
  if (value < 70) return 'bg-amber-400';
  return 'bg-brand-500';
}

function paceLabel(wpm: number): string {
  if (wpm < 100) return 'Slow';
  if (wpm > 190) return 'Fast';
  return 'Natural';
}

function SpeechTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-ink-100 px-3 py-2.5">
      <p className="text-[11px] text-ink-400">{label}</p>
      <p className="font-bold text-ink-900 text-[15px] tabular-nums">
        {value}
        {note && <span className="ml-1.5 text-[11px] font-medium text-ink-500">{note}</span>}
      </p>
    </div>
  );
}

function SpeechStrip({ metrics }: { metrics: SpeechMetricsValues }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-ink-400 mb-2">
        SPEECH DELIVERY <span className="font-normal normal-case tracking-normal">· measured from the recording</span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <SpeechTile
          label="Speaking pace"
          value={metrics.wordsPerMinute != null ? `${metrics.wordsPerMinute} wpm` : '—'}
          note={metrics.wordsPerMinute != null ? paceLabel(metrics.wordsPerMinute) : undefined}
        />
        <SpeechTile
          label="Talk time"
          value={metrics.talkRatio != null ? `${Math.round(metrics.talkRatio * 100)}%` : '—'}
          note="of recording"
        />
        <SpeechTile label="Long pauses (2s+)" value={String(metrics.longPauses)} />
        <SpeechTile
          label="Avg. start delay"
          value={metrics.responseDelaySeconds != null ? `${metrics.responseDelaySeconds}s` : '—'}
        />
      </div>
    </div>
  );
}

/**
 * The AI interview analysis: overall score (the average of the categories), each
 * category's independent 0–100% score with the AI's one-line reason, measured speech
 * delivery, and strengths / areas to explore. Content only — callers wrap it in a Card.
 */
export function AiAnalysisPanel({ summary }: { summary: InterviewSummary }) {
  const scores = summary.competencyScores ?? {};
  // New evaluations use the six categories; older ones keep whatever keys they had.
  const keys = SCORE_DIMENSIONS.every((d) => d.key in scores)
    ? SCORE_DIMENSIONS.map((d) => d.key as string)
    : Object.keys(scores);
  const hints: Record<string, string> = Object.fromEntries(SCORE_DIMENSIONS.map((d) => [d.key, d.hint]));

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className="text-center shrink-0">
          <Ring value={Math.round(Number(summary.overallScore))} size={84} stroke={7} />
          <p className="text-[11px] text-ink-400 mt-1.5">Overall</p>
        </div>
        <div className="min-w-0">
          <Badge tone={RECOMMENDATION_TONE[summary.recommendation]} dot>
            {RECOMMENDATION_LABELS[summary.recommendation]}
          </Badge>
          <p className="text-[13px] text-ink-700 leading-relaxed mt-2">{summary.observations}</p>
          <p className="text-[11.5px] text-ink-400 mt-1.5">
            Each category is scored out of 100% on its own; the overall is their average.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {keys.map((key) => {
          const value = Math.round(Number(scores[key]));
          const reason = summary.scoreReasons?.[key];
          return (
            <div key={key} title={hints[key]}>
              <div className="flex items-center justify-between text-[13px] mb-1.5">
                <span className="font-medium text-ink-700">{SCORE_LABELS[key] ?? key}</span>
                <span className="font-bold text-ink-900 tabular-nums">{value}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                <div className={`h-full rounded-full ${scoreBarColor(value)}`} style={{ width: `${value}%` }} />
              </div>
              {reason && <p className="text-[12px] text-ink-500 mt-1.5 leading-snug">{reason}</p>}
            </div>
          );
        })}
      </div>

      {summary.speechMetrics?.overall && <SpeechStrip metrics={summary.speechMetrics.overall} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-emerald-600 mb-2">STRENGTHS</p>
          {summary.strengths.length === 0 ? (
            <p className="text-[13px] text-ink-400">None identified.</p>
          ) : (
            <ul className="space-y-1.5">
              {summary.strengths.map((s, i) => (
                <li key={i} className="text-[13px] text-ink-700 flex gap-2">
                  <span className="text-emerald-500">✓</span> {s}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-amber-600 mb-2">AREAS TO EXPLORE</p>
          {summary.weaknesses.length === 0 ? (
            <p className="text-[13px] text-ink-400">None identified.</p>
          ) : (
            <ul className="space-y-1.5">
              {summary.weaknesses.map((s, i) => (
                <li key={i} className="text-[13px] text-ink-700 flex gap-2">
                  <span className="text-amber-500">•</span> {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-ink-50/70 p-3.5">
        <p className="text-[11px] font-semibold tracking-wide text-ink-400 mb-1">COMMUNICATION</p>
        <p className="text-[13px] text-ink-700">{summary.communicationNote}</p>
      </div>
    </div>
  );
}

/** Knowledge / Communication / Relevance chips for one question's analysis. */
export function QuestionScoreChips({
  dimensionScores,
}: {
  dimensionScores: { knowledge: number; communication: number; relevance: number };
}) {
  const items = [
    ['Knowledge', dimensionScores.knowledge],
    ['Communication', dimensionScores.communication],
    ['Relevance', dimensionScores.relevance],
  ] as const;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([label, value]) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink-100 bg-white px-2 py-0.5 text-[11.5px] text-ink-600"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${scoreBarColor(value)}`} />
          {label} <b className="text-ink-900 tabular-nums">{Math.round(value)}%</b>
        </span>
      ))}
    </div>
  );
}

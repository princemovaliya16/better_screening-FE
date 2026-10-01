import type { EvaluationView, QuestionDimensionScores } from '@/lib/api/evaluation.types';
import type { Interview, InterviewRecording } from '@/lib/api/interviews.types';

/**
 * The per-question model for the HR review screen — real data only: the interview's
 * own questions, each answer's transcript, and the AI's per-question analysis when it
 * exists. Nothing is invented; missing pieces stay null and the screen says so.
 */

export interface ReviewQuestion {
  id: string;
  questionText: string;
  /** The transcript, or a note on why there isn't one. */
  answer: string;
  score: number | null;
  feedback: string | null;
  dimensionScores: QuestionDimensionScores | null;
}

/** What to show in place of a transcript for one question. */
function answerFor(recording: InterviewRecording | undefined, recordingsLoaded: boolean): string {
  if (recording?.transcriptText?.trim()) return recording.transcriptText.trim();
  if (!recordingsLoaded) return 'Loading transcript…';
  if (!recording || recording.status === 'not_recorded') return 'The candidate did not answer this question.';
  if (recording.status === 'failed' || recording.transcriptionStatus === 'failed') {
    return 'The recording for this answer failed, so there is no transcript.';
  }
  if (recording.transcriptionStatus === 'completed') return 'No speech was detected in this answer.';
  return 'Transcript not available yet.';
}

export function buildReviewQuestions(
  interview: Interview,
  evaluation?: EvaluationView,
  recordings?: InterviewRecording[],
): ReviewQuestion[] {
  const recordingByQuestionId = new Map((recordings ?? []).map((r) => [r.questionId, r]));
  return interview.questions.map((q) => {
    const analysis = evaluation?.questionAnalyses?.find((a) => a.interviewQuestionId === q.id);
    return {
      id: q.id,
      questionText: q.questionText,
      answer: answerFor(recordingByQuestionId.get(q.id), !!recordings),
      score: analysis ? Math.round(Number(analysis.score)) : null,
      feedback: analysis?.feedback ?? null,
      dimensionScores: analysis?.dimensionScores ?? null,
    };
  });
}

import {
  RECOMMENDATION_LABELS,
  type EvaluationRecommendation,
  type EvaluationView,
} from '@/lib/api/evaluation.types';
import type { Interview } from '@/lib/api/interviews.types';
import type { InterviewRoundType } from '@/lib/api/jobs.types';

/**
 * The AI evaluation engine isn't wired up yet, so a completed interview usually has
 * no summary/question analysis to show. This builds the review model the HR review
 * screen renders: real evaluation data when the backend has it, otherwise deterministic
 * sample data derived from the interview itself (same interview → same numbers, so the
 * screen doesn't reshuffle on every render). `isSample` drives the "sample data" badge.
 */

export const COMPETENCY_LABELS: Record<string, string> = {
  technicalSkills: 'Technical',
  problemSolving: 'Problem solving',
  communication: 'Communication',
  culturalFit: 'Job fit',
  experienceRelevance: 'Experience',
  confidence: 'Confidence',
};

export interface ReviewCompetency {
  key: string;
  label: string;
  value: number;
}

export interface ReviewQuestion {
  id: string;
  questionText: string;
  answer: string;
  score: number;
  feedback: string;
}

export interface InterviewReview {
  /** True when any part of what's shown is placeholder data, not engine output. */
  isSample: boolean;
  /** Answers/transcript are always placeholders until recordings are transcribed. */
  hasSampleAnswers: boolean;
  /** True when the round had no configured questions and sample ones are shown. */
  hasSampleQuestions: boolean;
  overallScore: number;
  recommendation: EvaluationRecommendation;
  recommendationLabel: string;
  observations: string;
  communicationNote: string;
  strengths: string[];
  weaknesses: string[];
  competencies: ReviewCompetency[];
  questions: ReviewQuestion[];
  /** mm:ss for the recording transport — placeholder until real recordings play back. */
  recordingLength: string;
}

/** Small deterministic hash so the same interview always yields the same sample numbers. */
function seedOf(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const jitter = (seed: number, salt: number, spread: number) =>
  (seedOf(`${seed}:${salt}`) % (spread * 2 + 1)) - spread;

const clampScore = (n: number) => Math.max(35, Math.min(98, Math.round(n)));

const COMPETENCY_OFFSETS: [string, number][] = [
  ['technicalSkills', 5],
  ['communication', 0],
  ['problemSolving', 7],
  ['confidence', -7],
];

const SAMPLE_ANSWERS = [
  'Walked through the approach step by step, with a concrete example from a recent project and the trade-offs considered.',
  'Answered from direct experience — described the situation, what they owned, and how it turned out.',
  'Covered the key points and reasoned through the main trade-off, though the example stayed fairly high level.',
  'General answer that addressed the question conceptually without grounding it in a specific example.',
];

/** Sample Q&A shown when a round has no configured questions, so the review screen
 * still demonstrates the per-question scoring. Replace once the evaluation engine
 * returns real transcript-backed answers. */
const SAMPLE_QA: Record<InterviewRoundType, { question: string; answer: string }[]> = {
  ai_interview: [
    {
      question: 'Walk me through your background and what draws you to this role.',
      answer:
        'Gave a focused three-minute summary of their last two roles, the scope they owned, and tied their motivation directly to the responsibilities in this job description.',
    },
    {
      question: 'Tell me about a project you owned end to end. What was your role?',
      answer:
        'Described leading a project from requirements through release, including the hand-offs they coordinated and the metric it moved.',
    },
    {
      question: 'Describe a time you had to solve a problem with incomplete information.',
      answer:
        'Explained how they scoped the unknowns, shipped a small reversible change first, and validated with data before committing further.',
    },
    {
      question: 'How do you prioritise when everything is marked urgent?',
      answer:
        'Talked about aligning with stakeholders on impact vs. effort, and gave an example of pushing back on a deadline with a clear trade-off.',
    },
    {
      question: 'Where do you want to grow over the next couple of years?',
      answer:
        'Named a specific skill gap and the steps already taken to close it, though the longer-term answer stayed somewhat generic.',
    },
  ],
  technical: [
    {
      question: 'How would you design the data model for a feature like this one?',
      answer:
        'Sketched the core entities and relationships, explained the indexing choices, and called out where they would denormalise for read performance.',
    },
    {
      question: 'Walk me through how you would debug a slow endpoint in production.',
      answer:
        'Started from metrics and traces, narrowed to a query, and described how they would confirm the fix before and after deploying.',
    },
    {
      question: 'How do you decide what to unit test versus integration test?',
      answer:
        'Explained testing behaviour at boundaries and keeping unit tests for logic-heavy code, with an example from their current codebase.',
    },
    {
      question: 'Tell me about a technical decision you later regretted.',
      answer:
        'Gave a candid example of an early abstraction that did not pay off, and what they would do differently now.',
    },
    {
      question: 'How do you approach reviewing someone else’s pull request?',
      answer:
        'Described looking at correctness and intent first, style last, and keeping feedback specific — though did not mention handling disagreement.',
    },
  ],
  hr: [
    {
      question: 'What kind of team environment do you do your best work in?',
      answer:
        'Described a collaborative team with clear ownership, and gave an example of how they work with product and design day to day.',
    },
    {
      question: 'Tell me about a disagreement with a colleague and how you handled it.',
      answer:
        'Walked through a specific disagreement, how they separated the decision from the relationship, and how it was resolved.',
    },
    {
      question: 'Why are you looking to move on from your current role?',
      answer:
        'Framed the move around scope and growth rather than criticism of the current employer, with specifics about what is missing.',
    },
    {
      question: 'How do you handle feedback that you disagree with?',
      answer:
        'Said they ask for the underlying example first, then decide what to act on — supported with a recent review cycle example.',
    },
    {
      question: 'What are your expectations around compensation and notice period?',
      answer:
        'Gave a clear range and a 30-day notice period, and was open about a competing process in progress.',
    },
  ],
};

const SAMPLE_FEEDBACK = [
  'Good grasp of fundamentals. Could have gone slightly deeper on edge cases, but overall a convincing response.',
  'Clear reasoning and a concrete example. Strong, well-structured answer.',
  'Partial understanding. The response lacked specific examples and depth; would benefit from more concrete detail.',
  'Practical, experience-backed answer. Covered the essentials without over-explaining.',
];

const SAMPLE_STRENGTHS = [
  'Demonstrated ownership of production systems',
  'Fast, pragmatic problem solving',
  'Clear, structured communication with concrete examples',
];

const SAMPLE_WEAKNESSES = [
  'Limited exposure to large-scale distributed systems',
  'Could go deeper on testing strategy',
];

function recommendationFor(score: number): EvaluationRecommendation {
  if (score >= 85) return 'strong_hire';
  if (score >= 68) return 'hire';
  if (score >= 50) return 'no_hire';
  return 'strong_no_hire';
}

export function buildInterviewReview(
  interview: Interview,
  evaluation?: EvaluationView,
): InterviewReview {
  const summary = evaluation?.status === 'completed' ? evaluation.summary : undefined;
  const seed = seedOf(interview.id);

  const overallScore = summary
    ? Math.round(Number(summary.overallScore))
    : clampScore((interview.overallScore ?? 70) + 0);

  const recommendation = summary ? summary.recommendation : recommendationFor(overallScore);

  const competencies: ReviewCompetency[] = summary
    ? Object.entries(summary.competencyScores).map(([key, value]) => ({
        key,
        label: COMPETENCY_LABELS[key] ?? key,
        value: Math.round(Number(value)),
      }))
    : COMPETENCY_OFFSETS.map(([key, offset], i) => ({
        key,
        label: COMPETENCY_LABELS[key] ?? key,
        value: clampScore(overallScore + offset + jitter(seed, i, 3)),
      }));

  // Rounds created before questions were configured (or AI rounds whose questions
  // were never generated) have none stored — fall back to a sample set so the
  // per-question scoring is still demonstrated.
  const hasSampleQuestions = interview.questions.length === 0;
  const sourceQuestions = hasSampleQuestions
    ? SAMPLE_QA[interview.type].map((qa, i) => ({ id: `sample-${i}`, questionText: qa.question, answer: qa.answer }))
    : interview.questions.map((q, i) => ({
        id: q.id,
        questionText: q.questionText,
        answer: SAMPLE_ANSWERS[seedOf(`${seed}:a${i}`) % SAMPLE_ANSWERS.length],
      }));

  const questions: ReviewQuestion[] = sourceQuestions.map((q, i) => {
    const analysis = evaluation?.questionAnalyses?.find((a) => a.interviewQuestionId === q.id);
    const score = analysis ? Math.round(Number(analysis.score)) : clampScore(overallScore + jitter(seed, 100 + i, 8));
    return {
      id: q.id,
      questionText: q.questionText,
      // No transcript pipeline yet, so the answer text is always a placeholder.
      answer: q.answer,
      score,
      feedback: analysis
        ? analysis.feedback
        : score >= overallScore
          ? SAMPLE_FEEDBACK[seedOf(`${seed}:f${i}`) % 2]
          : SAMPLE_FEEDBACK[2 + (seedOf(`${seed}:f${i}`) % 2)],
    };
  });

  const minutes = interview.durationMinutes || 30;
  const seconds = seedOf(`${seed}:len`) % 60;

  return {
    isSample: !summary,
    hasSampleAnswers: true,
    hasSampleQuestions,
    overallScore,
    recommendation,
    recommendationLabel: RECOMMENDATION_LABELS[recommendation],
    observations:
      summary?.observations ??
      `Candidate showed genuine enthusiasm for the ${interview.job?.title ?? 'role'} and grounded answers in real project experience. Responses were relevant and mostly well-structured, with good signal on core competencies.`,
    communicationNote:
      summary?.communicationNote ?? 'Communicates adequately; occasionally verbose but understandable.',
    strengths: summary?.strengths ?? SAMPLE_STRENGTHS,
    weaknesses: summary?.weaknesses ?? SAMPLE_WEAKNESSES,
    competencies,
    questions,
    recordingLength: `${Math.max(1, minutes - 3)}:${String(seconds).padStart(2, '0')}`,
  };
}

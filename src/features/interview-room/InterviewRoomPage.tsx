import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { interviewSessionApi } from '@/lib/api/interview-session.api';
import type { CandidateSessionResponse } from '@/lib/api/interview-session.types';
import { isRecordingSupported, useMediaRecorder } from './hooks/useMediaRecorder';
import { useCountdown } from './hooks/useCountdown';

type Stage =
  | 'loading'
  | 'invalid'
  | 'already_submitted'
  | 'landing'
  | 'device_check'
  | 'permission_denied'
  | 'unsupported'
  | 'question'
  | 'uploading'
  | 'submitting'
  | 'done'
  | 'error';

function firstUnansweredIndex(session: CandidateSessionResponse): number {
  const idx = session.questions.findIndex((q) => !q.answered);
  return idx === -1 ? session.questions.length : idx;
}

export function InterviewRoomPage() {
  const { token } = useParams<{ token: string }>();
  const [stage, setStage] = useState<Stage>('loading');
  const [session, setSession] = useState<CandidateSessionResponse | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorder = useMediaRecorder();

  const loadSession = async () => {
    if (!token) return;
    try {
      const data = await interviewSessionApi.getSession(token);
      setSession(data);
      if (data.status === 'submitted') {
        setStage('already_submitted');
      } else {
        setStage('landing');
      }
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
      setStage(err instanceof ApiError && err.status !== 500 ? 'invalid' : 'error');
    }
  };

  useEffect(() => {
    loadSession();
    return () => recorder.release();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (videoRef.current && recorder.stream) {
      videoRef.current.srcObject = recorder.stream;
    }
  }, [recorder.stream]);

  const handleExpire = async () => {
    if (stage === 'done' || stage === 'already_submitted' || stage === 'submitting') return;
    setAutoSubmitted(true);
    setStage('submitting');
    if (recorder.isRecording) {
      try {
        await recorder.stopRecording();
      } catch {
        /* ignore — we're submitting regardless */
      }
    }
    try {
      if (token) await interviewSessionApi.submit(token);
    } finally {
      setStage('done');
    }
  };

  const countdown = useCountdown(session?.deadlineAt ?? null, handleExpire);

  const beginDeviceCheck = () => {
    if (!isRecordingSupported()) {
      setStage('unsupported');
      return;
    }
    setStage('device_check');
    recorder.requestPermission();
  };

  const beginInterview = () => {
    if (!session) return;
    setQuestionIndex(firstUnansweredIndex(session));
    setStage('question');
  };

  const finishRound = async () => {
    setStage('submitting');
    try {
      if (token) await interviewSessionApi.submit(token);
    } finally {
      setStage('done');
    }
  };

  const handleStopAndNext = async () => {
    if (!token || !session) return;
    const currentQuestion = session.questions[questionIndex];
    try {
      const { blob, mimeType } = await recorder.stopRecording();
      setStage('uploading');
      const { uploadUrl, storageKey } = await interviewSessionApi.getUploadUrl(
        token,
        currentQuestion.id,
        mimeType,
      );
      await interviewSessionApi.uploadToPresignedUrl(uploadUrl, blob, mimeType);
      await interviewSessionApi.completeQuestion(token, currentQuestion.id, {
        storageKey,
        mimeType,
        durationSeconds: undefined,
        sizeBytes: blob.size,
      });
      setSession((s) =>
        s
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === currentQuestion.id ? { ...q, answered: true } : q,
              ),
            }
          : s,
      );

      const nextIndex = questionIndex + 1;
      if (nextIndex >= session.questions.length) {
        await finishRound();
      } else {
        setQuestionIndex(nextIndex);
        setStage('question');
      }
    } catch {
      setErrorMessage('We could not save that answer — please try recording it again.');
      setStage('question');
    }
  };

  // ---- Render ----

  if (stage === 'loading') {
    return <p className="text-ink-500">Loading your interview…</p>;
  }

  if (stage === 'invalid') {
    return (
      <div className="text-center max-w-sm">
        <h1 className="font-bold text-xl text-ink-900">This link isn't valid</h1>
        <p className="text-[14px] text-ink-500 mt-2">
          {errorMessage || 'This interview link is invalid, expired, or no longer active.'}
        </p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="text-center max-w-sm">
        <h1 className="font-bold text-xl text-ink-900">Something went wrong</h1>
        <p className="text-[14px] text-ink-500 mt-2">{errorMessage}</p>
        <Button variant="secondary" className="mt-4" onClick={loadSession}>
          Try again
        </Button>
      </div>
    );
  }

  if (stage === 'already_submitted') {
    return (
      <div className="text-center max-w-sm">
        <h1 className="font-bold text-xl text-ink-900">You've already completed this interview</h1>
        <p className="text-[14px] text-ink-500 mt-2">
          Thanks for taking the time — the hiring team will be in touch.
        </p>
      </div>
    );
  }

  if (stage === 'unsupported') {
    return (
      <div className="text-center max-w-sm">
        <h1 className="font-bold text-xl text-ink-900">Browser not supported</h1>
        <p className="text-[14px] text-ink-500 mt-2">
          Your browser doesn't support recording video. Please retry using the latest Chrome,
          Edge, or Firefox.
        </p>
      </div>
    );
  }

  if (stage === 'landing' && session) {
    return (
      <div className="text-center max-w-sm">
        <h1 className="font-bold text-xl text-ink-900">You're invited to an interview</h1>
        <p className="text-[14px] text-ink-500 mt-2">
          <b>{session.roundName}</b> for the <b>{session.jobTitle}</b> role.
        </p>
        <p className="text-[13px] text-ink-400 mt-1">
          {session.questions.length} question{session.questions.length !== 1 ? 's' : ''} ·{' '}
          {session.durationMinutes} minutes once you begin
        </p>
        <Button variant="ai" className="mt-5" onClick={beginDeviceCheck}>
          Begin
        </Button>
      </div>
    );
  }

  if (stage === 'permission_denied') {
    return (
      <div className="text-center max-w-sm">
        <h1 className="font-bold text-xl text-ink-900">Camera & microphone needed</h1>
        <p className="text-[14px] text-ink-500 mt-2">
          Please allow camera and microphone access in your browser's settings, then try again.
        </p>
        <Button variant="ai" className="mt-4" onClick={() => recorder.requestPermission()}>
          Try again
        </Button>
      </div>
    );
  }

  if (stage === 'device_check') {
    return (
      <div className="text-center max-w-md w-full">
        <h1 className="font-bold text-xl text-ink-900 mb-3">Device check</h1>
        {recorder.permission === 'requesting' && (
          <p className="text-[14px] text-ink-500">Requesting camera & microphone access…</p>
        )}
        {recorder.permission === 'denied' && (
          <div>
            <p className="text-[14px] text-rose-500 mb-3">{recorder.error}</p>
            <Button variant="ai" onClick={() => recorder.requestPermission()}>
              Try again
            </Button>
          </div>
        )}
        {recorder.permission === 'granted' && (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-xl bg-ink-900 aspect-video mb-4"
            />
            <p className="text-[13px] text-ink-500 mb-4">
              Looking good. When you're ready, begin the interview — the timer starts as soon as
              you do.
            </p>
            <Button variant="ai" onClick={beginInterview}>
              Start interview
            </Button>
          </>
        )}
      </div>
    );
  }

  if ((stage === 'question' || stage === 'uploading') && session) {
    const q = session.questions[questionIndex];
    return (
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-medium text-ink-500">
            Question {questionIndex + 1} of {session.questions.length}
          </span>
          <span
            className={`text-[13px] font-semibold tabular-nums ${countdown.isLow ? 'text-rose-500' : 'text-ink-700'}`}
          >
            {countdown.formatted} remaining
          </span>
        </div>
        <div className="rounded-xl bg-ink-50 p-5 mb-4">
          <p className="text-[16px] font-medium text-ink-900">{q.questionText}</p>
        </div>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-xl bg-ink-900 aspect-video mb-4"
        />
        {errorMessage && <p className="text-[13px] text-rose-500 mb-3">{errorMessage}</p>}
        {stage === 'uploading' ? (
          <Button variant="ai" className="w-full" loading disabled>
            Saving your answer…
          </Button>
        ) : recorder.isRecording ? (
          <Button variant="ai" className="w-full" onClick={handleStopAndNext}>
            Stop & {questionIndex + 1 >= session.questions.length ? 'finish' : 'next'}
          </Button>
        ) : (
          <Button variant="ai" className="w-full" onClick={recorder.startRecording}>
            Start recording
          </Button>
        )}
      </div>
    );
  }

  if (stage === 'submitting') {
    return <p className="text-ink-500">Finalizing your interview…</p>;
  }

  if (stage === 'done') {
    return (
      <div className="text-center max-w-sm">
        <h1 className="font-bold text-xl text-ink-900">
          {autoSubmitted ? "Time's up — you're all done" : 'Thank you!'}
        </h1>
        <p className="text-[14px] text-ink-500 mt-2">
          {autoSubmitted
            ? 'Your allotted time ran out, so we submitted your answers so far. '
            : "You've completed the interview. "}
          The hiring team will review your responses and follow up. You may close this window
          now.
        </p>
      </div>
    );
  }

  return null;
}

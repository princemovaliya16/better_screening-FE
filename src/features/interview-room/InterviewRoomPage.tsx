import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { LocalVideoTrack } from 'livekit-client';
import { Button, Field, Select } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { interviewSessionApi } from '@/lib/api/interview-session.api';
import type { CandidateSessionResponse } from '@/lib/api/interview-session.types';
import { isLiveKitSupported, useLiveKitRoom } from './hooks/useLiveKitRoom';
import { useCountdown } from './hooks/useCountdown';

type Stage =
  | 'loading'
  | 'invalid'
  | 'already_submitted'
  | 'landing'
  | 'device_check'
  | 'unsupported'
  | 'joining'
  | 'question'
  | 'submitting'
  | 'done'
  | 'error';

/** Per-question recording state — the recording itself runs server-side (Egress). */
type RecordingPhase = 'idle' | 'starting' | 'recording' | 'stopping';

function firstUnansweredIndex(session: CandidateSessionResponse): number {
  const idx = session.questions.findIndex((q) => !q.answered);
  return idx === -1 ? session.questions.length : idx;
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function LocalPreview({ track }: { track: LocalVideoTrack | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="w-full rounded-xl bg-ink-900 aspect-video -scale-x-100"
    />
  );
}

function useElapsed(since: number | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since == null) return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [since]);
  if (since == null) return '0:00';
  const total = Math.max(0, Math.floor((now - since) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function InterviewRoomPage() {
  const { token } = useParams<{ token: string }>();
  const [stage, setStage] = useState<Stage>('loading');
  const [session, setSession] = useState<CandidateSessionResponse | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>('idle');
  const [recordingSince, setRecordingSince] = useState<number | null>(null);
  const room = useLiveKitRoom();
  const elapsed = useElapsed(recordingSince);

  const loadSession = async () => {
    if (!token) return;
    try {
      const data = await interviewSessionApi.getSession(token);
      setSession(data);
      setStage(data.status === 'submitted' ? 'already_submitted' : 'landing');
    } catch (err) {
      setErrorMessage(errorText(err, 'Something went wrong.'));
      setStage(err instanceof ApiError && err.status !== 500 ? 'invalid' : 'error');
    }
  };

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // A dropped connection ends whatever was being recorded — that answer has to be redone.
  useEffect(() => {
    if (room.connectionState === 'lost' && recordingPhase !== 'idle') {
      setRecordingPhase('idle');
      setRecordingSince(null);
      setErrorMessage('Your connection dropped, so that answer was not saved. Please record it again.');
    }
  }, [room.connectionState, recordingPhase]);

  const submitRound = async (auto: boolean) => {
    setAutoSubmitted(auto);
    setStage('submitting');
    try {
      // The backend stops any in-flight recording and closes the room on submit.
      if (token) await interviewSessionApi.submit(token);
    } finally {
      room.release();
      setStage('done');
    }
  };

  const handleExpire = () => {
    if (stage === 'done' || stage === 'already_submitted' || stage === 'submitting') return;
    void submitRound(true);
  };

  const countdown = useCountdown(session?.deadlineAt ?? null, handleExpire);

  const beginDeviceCheck = () => {
    if (!isLiveKitSupported()) {
      setStage('unsupported');
      return;
    }
    setStage('device_check');
    room.requestPermission();
  };

  /** Joins the LiveKit room (starting the round clock on first join). Also used to
   * rejoin after a lost connection — the backend issues a fresh room token. */
  const joinRoom = async () => {
    if (!token) return false;
    const join = await interviewSessionApi.joinLivekit(token);
    setSession((s) => (s ? { ...s, startedAt: join.startedAt, deadlineAt: join.deadlineAt } : s));
    await room.connect(join.wsUrl, join.token);
    return true;
  };

  const beginInterview = async () => {
    if (!session) return;
    setErrorMessage('');
    setStage('joining');
    try {
      await joinRoom();
    } catch (err) {
      setErrorMessage(errorText(err, 'We could not connect you to the interview room. Please try again.'));
      setStage('device_check');
      return;
    }
    const idx = firstUnansweredIndex(session);
    if (idx >= session.questions.length) {
      // Nothing left to answer (e.g. every answer was saved before a crash) — just submit.
      await submitRound(false);
      return;
    }
    setQuestionIndex(idx);
    setStage('question');
  };

  const reconnect = async () => {
    setErrorMessage('');
    try {
      await joinRoom();
    } catch (err) {
      setErrorMessage(errorText(err, 'Still unable to reconnect — check your internet connection.'));
    }
  };

  /** Starts the server-side recording for one question. Used by the candidate's first
   * "Start recording" click, and automatically for every following question. */
  const startRecordingFor = async (index: number) => {
    if (!token || !session) return;
    setErrorMessage('');
    setRecordingPhase('starting');
    try {
      await interviewSessionApi.startRecording(token, session.questions[index].id);
      setRecordingSince(Date.now());
      setRecordingPhase('recording');
    } catch (err) {
      // Falls back to the manual "Start recording" button for this question.
      setErrorMessage(errorText(err, 'We could not start recording — please try again.'));
      setRecordingPhase('idle');
    }
  };

  /** "Save & next" / "End call": saves the current answer, then either moves straight
   * on to recording the next question or, on the last one, submits the interview. */
  const saveAndContinue = async () => {
    if (!token || !session) return;
    const currentQuestion = session.questions[questionIndex];
    setRecordingPhase('stopping');
    try {
      await interviewSessionApi.stopRecording(token, currentQuestion.id);
    } catch (err) {
      setErrorMessage(errorText(err, 'We could not save that answer — please try again.'));
      setRecordingPhase('recording');
      return;
    }
    setRecordingPhase('idle');
    setRecordingSince(null);
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
      await submitRound(false);
    } else {
      setQuestionIndex(nextIndex);
      await startRecordingFor(nextIndex);
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
          Your browser doesn't support live video. Please retry using the latest Chrome, Edge,
          Firefox, or Safari.
        </p>
      </div>
    );
  }

  if (stage === 'landing' && session) {
    const resuming = !!session.startedAt;
    return (
      <div className="text-center max-w-sm">
        <h1 className="font-bold text-xl text-ink-900">
          {resuming ? 'Welcome back' : "You're invited to an interview"}
        </h1>
        <p className="text-[14px] text-ink-500 mt-2">
          <b>{session.roundName}</b> for the <b>{session.jobTitle}</b> role.
        </p>
        <p className="text-[13px] text-ink-400 mt-1">
          {session.questions.length} question{session.questions.length !== 1 ? 's' : ''} ·{' '}
          {resuming
            ? `${countdown.formatted} remaining`
            : `${session.durationMinutes} minutes once you begin`}
        </p>
        <Button variant="ai" className="mt-5" onClick={beginDeviceCheck}>
          {resuming ? 'Continue' : 'Begin'}
        </Button>
      </div>
    );
  }

  if (stage === 'device_check' || stage === 'joining') {
    return (
      <div className="text-center max-w-md w-full">
        <h1 className="font-bold text-xl text-ink-900 mb-3">Device check</h1>
        {room.permission === 'requesting' && (
          <p className="text-[14px] text-ink-500">Requesting camera & microphone access…</p>
        )}
        {room.permission === 'denied' && (
          <div>
            <p className="text-[14px] text-rose-500 mb-3">{room.error}</p>
            <Button variant="ai" onClick={() => room.requestPermission()}>
              Try again
            </Button>
          </div>
        )}
        {room.permission === 'granted' && (
          <>
            <div className="mb-4">
              <LocalPreview track={room.videoTrack} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-left mb-4">
              <Field label="Camera">
                <Select
                  value={room.videoDeviceId}
                  disabled={stage === 'joining'}
                  onChange={(e) => room.selectDevice('videoinput', e.target.value)}
                >
                  {room.videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || 'Camera'}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Microphone">
                <Select
                  value={room.audioDeviceId}
                  disabled={stage === 'joining'}
                  onChange={(e) => room.selectDevice('audioinput', e.target.value)}
                >
                  {room.audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || 'Microphone'}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {errorMessage && <p className="text-[13px] text-rose-500 mb-3">{errorMessage}</p>}
            <p className="text-[13px] text-ink-500 mb-4">
              Looking good. When you're ready, start the interview — the timer starts as soon as
              you do.
            </p>
            <Button
              variant="ai"
              onClick={beginInterview}
              loading={stage === 'joining'}
              disabled={stage === 'joining'}
            >
              {stage === 'joining' ? 'Connecting…' : 'Start interview'}
            </Button>
          </>
        )}
      </div>
    );
  }

  if (stage === 'question' && session) {
    const q = session.questions[questionIndex];
    const isLast = questionIndex + 1 >= session.questions.length;
    const connected = room.connectionState === 'connected';
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

        {room.connectionState === 'reconnecting' && (
          <div className="rounded-lg bg-amber-50 text-amber-800 text-[13px] px-3 py-2 mb-3">
            Reconnecting… please stay on this page.
          </div>
        )}
        {room.connectionState === 'lost' && (
          <div className="rounded-lg bg-rose-50 text-rose-700 text-[13px] px-3 py-2 mb-3 flex items-center justify-between gap-3">
            <span>Connection lost.</span>
            <Button size="sm" variant="secondary" onClick={reconnect}>
              Reconnect
            </Button>
          </div>
        )}

        <div className="rounded-xl bg-ink-50 p-5 mb-4">
          <p className="text-[16px] font-medium text-ink-900">{q.questionText}</p>
        </div>
        <div className="relative mb-4">
          <LocalPreview track={room.videoTrack} />
          {recordingPhase === 'recording' && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-semibold text-white tabular-nums">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              REC {elapsed}
            </span>
          )}
        </div>
        {errorMessage && <p className="text-[13px] text-rose-500 mb-3">{errorMessage}</p>}

        {recordingPhase === 'idle' && (
          <Button
            variant="ai"
            className="w-full"
            onClick={() => startRecordingFor(questionIndex)}
            disabled={!connected}
          >
            Start recording
          </Button>
        )}
        {recordingPhase === 'starting' && (
          <Button variant="ai" className="w-full" loading disabled>
            Starting recording…
          </Button>
        )}
        {recordingPhase === 'recording' &&
          (isLast ? (
            <Button
              className="w-full !bg-rose-600 hover:!bg-rose-700 !shadow-rose-600/20"
              onClick={saveAndContinue}
              disabled={!connected}
            >
              End call
            </Button>
          ) : (
            <Button variant="ai" className="w-full" onClick={saveAndContinue} disabled={!connected}>
              Save & next
            </Button>
          ))}
        {recordingPhase === 'stopping' && (
          <Button variant="ai" className="w-full" loading disabled>
            {isLast ? 'Ending call…' : 'Saving your answer…'}
          </Button>
        )}
        {recordingPhase === 'recording' && !isLast && (
          <p className="text-[12px] text-ink-400 text-center mt-2">
            The next question starts recording automatically.
          </p>
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

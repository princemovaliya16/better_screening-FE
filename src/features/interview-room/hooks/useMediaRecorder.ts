import { useCallback, useRef, useState } from 'react';

export type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied';

/** Picks the first codec the browser's MediaRecorder actually supports — Safari's
 * support lags Chrome/Firefox, so this can't be hardcoded. */
function pickMimeType(): string | null {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export function isRecordingSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    pickMimeType() !== null
  );
}

/**
 * Requests camera+mic once and keeps the stream alive across multiple question
 * recordings (re-requesting permission per-question would be a jarring UX and risks
 * the candidate declining partway through). Each `startRecording`/`stopRecording`
 * pair creates a fresh MediaRecorder on top of the same stream.
 */
export function useMediaRecorder() {
  const [permission, setPermission] = useState<PermissionState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('video/webm');

  const requestPermission = useCallback(async (): Promise<MediaStream | null> => {
    setPermission('requesting');
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setPermission('granted');
      return mediaStream;
    } catch {
      setPermission('denied');
      setError('Camera/microphone access was denied.');
      return null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setError('No active camera/microphone stream.');
      return;
    }
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError('Your browser does not support recording video.');
      return;
    }
    mimeTypeRef.current = mimeType;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback((): Promise<{ blob: Blob; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        reject(new Error('Not recording'));
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        setIsRecording(false);
        resolve({ blob, mimeType: mimeTypeRef.current });
      };
      recorder.stop();
    });
  }, []);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setStream(null);
    setIsRecording(false);
    setPermission('idle');
  }, []);

  return {
    permission,
    isRecording,
    error,
    stream,
    requestPermission,
    startRecording,
    stopRecording,
    release,
  };
}

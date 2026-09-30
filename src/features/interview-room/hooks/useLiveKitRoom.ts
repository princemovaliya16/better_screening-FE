import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConnectionState,
  createLocalTracks,
  isBrowserSupported,
  LocalAudioTrack,
  LocalVideoTrack,
  Room,
  RoomEvent,
  Track,
  type LocalTrack,
} from 'livekit-client';

export type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied';
export type RoomConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'lost';

export function isLiveKitSupported(): boolean {
  return isBrowserSupported() && !!navigator.mediaDevices?.getUserMedia;
}

/** getUserMedia fails for very different reasons (no device, device busy, permission
 * blocked) — tell the candidate which one so they can actually fix it. */
function mediaErrorMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera/microphone access was blocked. Allow it from the camera icon in the address bar (or your browser settings), then try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera or microphone was found. Connect a webcam and microphone, then try again.';
    case 'NotReadableError':
    case 'AbortError':
      return 'Your camera or microphone is being used by another app (e.g. Zoom, Meet, Teams). Close it, then try again.';
    default:
      return 'We could not access your camera and microphone. Check your devices and try again.';
  }
}

/**
 * The candidate's side of the LiveKit interview room. Camera + mic are captured once
 * for the device check and then published into the room on join, so the preview the
 * candidate approved is exactly what gets recorded. Recording itself happens
 * server-side (LiveKit Egress, started/stopped through our API) — this hook only
 * captures, publishes, and reports connection health.
 */
export function useLiveKitRoom() {
  const [permission, setPermission] = useState<PermissionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [connectionState, setConnectionState] = useState<RoomConnectionState>('idle');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDeviceId, setVideoDeviceId] = useState<string>('');
  const [audioDeviceId, setAudioDeviceId] = useState<string>('');

  const tracksRef = useRef<LocalTrack[]>([]);
  const roomRef = useRef<Room | null>(null);
  const leavingRef = useRef(false);

  const stopTracks = () => {
    tracksRef.current.forEach((t) => t.stop());
    tracksRef.current = [];
    setVideoTrack(null);
  };

  const captureTracks = async (videoId?: string, audioId?: string): Promise<LocalTrack[]> => {
    const tracks = await createLocalTracks({
      audio: audioId ? { deviceId: audioId } : true,
      video: videoId ? { deviceId: videoId } : true,
    });
    tracksRef.current = tracks;
    setVideoTrack((tracks.find((t) => t.kind === Track.Kind.Video) as LocalVideoTrack) ?? null);
    return tracks;
  };

  const requestPermission = useCallback(async () => {
    setPermission('requesting');
    setError(null);
    try {
      stopTracks();
      const tracks = await captureTracks();
      const [videos, audios] = await Promise.all([
        Room.getLocalDevices('videoinput', false),
        Room.getLocalDevices('audioinput', false),
      ]);
      setVideoDevices(videos);
      setAudioDevices(audios);
      const video = tracks.find((t) => t.kind === Track.Kind.Video);
      const audio = tracks.find((t) => t.kind === Track.Kind.Audio);
      setVideoDeviceId((video?.mediaStreamTrack.getSettings().deviceId as string) ?? '');
      setAudioDeviceId((audio?.mediaStreamTrack.getSettings().deviceId as string) ?? '');
      setPermission('granted');
    } catch (err) {
      setPermission('denied');
      setError(mediaErrorMessage(err));
    }
  }, []);

  /** Swap camera or microphone during the device check (before joining). */
  const selectDevice = useCallback(async (kind: 'videoinput' | 'audioinput', deviceId: string) => {
    const track = tracksRef.current.find((t) =>
      kind === 'videoinput' ? t.kind === Track.Kind.Video : t.kind === Track.Kind.Audio,
    );
    if (!track) return;
    try {
      if (track instanceof LocalVideoTrack || track instanceof LocalAudioTrack) {
        await track.restartTrack({ deviceId });
      }
      if (kind === 'videoinput') setVideoDeviceId(deviceId);
      else setAudioDeviceId(deviceId);
    } catch {
      setError('Could not switch to that device.');
    }
  }, []);

  /** Joins the room and publishes camera + mic. Safe to call again after the
   * connection is lost (with a fresh token from the backend). */
  const connect = useCallback(
    async (wsUrl: string, token: string) => {
      roomRef.current?.removeAllListeners();
      if (roomRef.current) {
        leavingRef.current = true;
        await roomRef.current.disconnect(false);
      }
      leavingRef.current = false;

      const room = new Room({ adaptiveStream: false, dynacast: false });
      roomRef.current = room;
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Connected) setConnectionState('connected');
        else if (
          state === ConnectionState.Reconnecting ||
          state === ConnectionState.SignalReconnecting
        )
          setConnectionState('reconnecting');
        else if (state === ConnectionState.Connecting) setConnectionState('connecting');
      });
      room.on(RoomEvent.Disconnected, () => {
        if (!leavingRef.current) setConnectionState('lost');
      });

      setConnectionState('connecting');
      await room.connect(wsUrl, token);

      // Tracks can end underneath us (device unplugged, previous room stopped them).
      let tracks = tracksRef.current;
      if (tracks.length === 0 || tracks.some((t) => t.mediaStreamTrack.readyState === 'ended')) {
        stopTracks();
        tracks = await captureTracks(videoDeviceId || undefined, audioDeviceId || undefined);
      }
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
      }
      setConnectionState('connected');
    },
    [videoDeviceId, audioDeviceId],
  );

  /** Leaves the room and turns the camera off. */
  const release = useCallback(() => {
    leavingRef.current = true;
    const room = roomRef.current;
    roomRef.current = null;
    room?.removeAllListeners();
    void room?.disconnect(true);
    stopTracks();
    setConnectionState('idle');
    setPermission('idle');
  }, []);

  useEffect(() => release, [release]);

  return {
    permission,
    error,
    videoTrack,
    connectionState,
    videoDevices,
    audioDevices,
    videoDeviceId,
    audioDeviceId,
    requestPermission,
    selectDevice,
    connect,
    release,
  };
}

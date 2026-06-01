import { useCallback, useEffect, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import {
  useAudioPlayer,
  useAudioRecorder,
  AudioQuality,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { useAuth } from '@/context/auth';

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const WS_URL = BASE_URL.replace(/^http/, 'ws') + '/voice';

/** Sample rate Gemini Live outputs (PCM16 mono). */
const GEMINI_OUTPUT_SAMPLE_RATE = 24_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceState =
  | 'idle'        // not connected
  | 'connecting'  // WebSocket opening + Gemini Live initialising
  | 'ready'       // waiting for user to speak
  | 'recording'   // microphone active
  | 'processing'  // audio sent, waiting for model
  | 'speaking'    // model is sending audio back
  | 'error';

export type UseVoiceAgentCallbacks = {
  /** Called with the live transcription of what the user said. */
  onInputTranscription?: (text: string) => void;
  /** Called with the live transcription of what the assistant is saying. */
  onOutputTranscription?: (text: string) => void;
  /** Called when the voice agent decides to route to a specific agent. */
  onRouting?: (agent: 'ios' | 'google' | 'microsoft') => void;
  /**
   * Called when the iOS agent needs device tools executed.
   * The client should run each tool and return the results array.
   */
  onDevicePending?: (calls: { tool: string; args: Record<string, unknown> }[]) => Promise<{ tool: string; result: unknown }[]>;
};

// ─── WAV builder ─────────────────────────────────────────────────────────────

/**
 * Assembles an array of base64-encoded PCM16 chunks into a WAV file (base64).
 * Used to play Gemini Live audio output via expo-audio.
 */
function buildWavFromPcm16(base64Chunks: string[], sampleRate: number): string {
  const pcmArrays = base64Chunks.map((b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  });

  const pcmLength = pcmArrays.reduce((s, a) => s + a.length, 0);
  const buf = new ArrayBuffer(44 + pcmLength);
  const v = new DataView(buf);

  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };

  str(0, 'RIFF');
  v.setUint32(4, 36 + pcmLength, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);       // PCM subchunk size
  v.setUint16(20, 1, true);        // PCM format
  v.setUint16(22, 1, true);        // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true);        // block align
  v.setUint16(34, 16, true);       // bits per sample
  str(36, 'data');
  v.setUint32(40, pcmLength, true);

  const out = new Uint8Array(buf);
  let offset = 44;
  for (const arr of pcmArrays) {
    out.set(arr, offset);
    offset += arr.length;
  }

  let bin = '';
  for (let i = 0; i < out.length; i++) bin += String.fromCharCode(out[i]);
  return btoa(bin);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceAgent(callbacks: UseVoiceAgentCallbacks = {}) {
  const { user, getAccessToken } = useAuth();

  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Stable ref for callbacks so WebSocket handlers never capture stale functions.
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const wsRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<string[]>([]);

  // Recorder: PCM16 mono 16 kHz — matches Gemini Live input requirements.
  const recorder = useAudioRecorder(
    {
      sampleRate: 16_000,
      numberOfChannels: 1,
      bitRate: 128_000,
      extension: '.wav',
      ios: {
        outputFormat: 'lpcm',
        audioQuality: AudioQuality.MAX,
        linearPCMBitDepth: 16,
        linearPCMIsFloat: false,
        linearPCMIsBigEndian: false,
      },
    },
  );

  // Player: plays WAV files assembled from Gemini's PCM16 output.
  const player = useAudioPlayer(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const wsSend = useCallback((msg: object) => {
    wsRef.current?.send(JSON.stringify(msg));
  }, []);

  const playPcmChunks = useCallback(
    async (chunks: string[]) => {
      if (chunks.length === 0) return;
      const wavBase64 = buildWavFromPcm16(chunks, GEMINI_OUTPUT_SAMPLE_RATE);
      const path = FileSystem.cacheDirectory + 'luminate_voice_response.wav';
      await FileSystem.writeAsStringAsync(path, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      player.replace({ uri: path });
      player.play();
    },
    [player],
  );

  // ── WebSocket message handler ──────────────────────────────────────────────

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string);

      switch (msg.type) {
        case 'ready':
          setState('ready');
          break;

        case 'input_transcription':
          cbRef.current.onInputTranscription?.(msg.text);
          break;

        case 'output_transcription':
          cbRef.current.onOutputTranscription?.(msg.text);
          break;

        case 'routing':
          cbRef.current.onRouting?.(msg.agent);
          break;

        case 'audio':
          audioChunksRef.current.push(msg.data);
          setState('speaking');
          break;

        case 'audio_complete':
          if (audioChunksRef.current.length > 0) {
            await playPcmChunks(audioChunksRef.current);
            audioChunksRef.current = [];
          }
          setState('ready');
          break;

        case 'device_pending':
          if (cbRef.current.onDevicePending) {
            const results = await cbRef.current.onDevicePending(msg.calls);
            wsSend({ type: 'device_result', results });
          }
          break;

        case 'error':
          setError(msg.message ?? 'Unknown voice error');
          setState('error');
          break;
      }
    },
    [playPcmChunks, wsSend],
  );

  // ── Connect / disconnect ───────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (wsRef.current) return;
    setState('connecting');
    setError(null);

    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setError('Microphone permission is required.');
      setState('error');
      return;
    }

    const accessToken = await getAccessToken();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'init',
          provider: user?.provider ?? 'ios',
          accessToken: accessToken ?? undefined,
        }),
      );
    };

    ws.onmessage = (e) => void handleMessage(e);

    ws.onerror = () => {
      setError('Could not connect to the voice server.');
      setState('error');
      wsRef.current = null;
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (state !== 'error') setState('idle');
    };
  }, [getAccessToken, handleMessage, state, user]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setState('idle');
  }, []);

  // ── Push-to-talk ──────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (state !== 'ready') return;

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setState('recording');
  }, [recorder, state]);

  const stopRecording = useCallback(async () => {
    if (state !== 'recording') return;

    await recorder.stop();
    setState('processing');

    const uri = recorder.uri;
    if (uri) {
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      wsSend({ type: 'audio', data: base64Audio, mimeType: 'audio/wav' });
      wsSend({ type: 'audio_end' });
    }
  }, [recorder, state, wsSend]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    state,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
  };
}

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVoiceAgent, type VoiceState } from '@/hooks/use-voice-agent';
import { sendMessage } from '@/services/chat';

// ─── Types ────────────────────────────────────────────────────────────────────

type Transcript = { role: 'user' | 'assistant'; text: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATE_LABEL: Record<VoiceState, string> = {
  idle:       'Tap to start',
  connecting: 'Connecting…',
  ready:      'Hold to speak',
  recording:  'Listening…',
  processing: 'Thinking…',
  speaking:   'Speaking…',
  error:      'Error',
};

const AGENT_LABEL: Record<string, string> = {
  ios:       'iOS',
  google:    'Google',
  microsoft: 'Microsoft',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceButton() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [routingAgent, setRoutingAgent] = useState<string | null>(null);
  const [iosSessionId, setIosSessionId] = useState<string | undefined>(undefined);

  const appendTranscript = useCallback((role: Transcript['role'], text: string) => {
    setTranscripts((prev) => {
      // Merge with the last entry if the same role is still streaming in.
      if (prev.length > 0 && prev[prev.length - 1].role === role) {
        return [...prev.slice(0, -1), { role, text }];
      }
      return [...prev, { role, text }];
    });
  }, []);

  const { state, error, connect, disconnect, startRecording, stopRecording } = useVoiceAgent({
    onInputTranscription: (text) => appendTranscript('user', text),
    onOutputTranscription: (text) => appendTranscript('assistant', text),
    onRouting: (agent) => setRoutingAgent(agent),
    onDevicePending: async (calls) => {
      // Execute device tools via the existing chat service, reusing its executor.
      // We import sendMessage only for the device-tool path — the voice agent
      // handles routing itself, but iOS tools must still run on-device.
      const { executeDeviceToolsForVoice } = await import('@/services/chat');
      return executeDeviceToolsForVoice(calls);
    },
  });

  // ── Connect on mount, disconnect on unmount ────────────────────────────────
  useEffect(() => {
    connect();
    return () => { disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Button visuals ────────────────────────────────────────────────────────

  const isLoading = state === 'connecting' || state === 'processing';
  const isActive = state === 'recording';
  const canPress = state === 'ready';

  return (
    <ThemedView style={styles.container}>
      {/* Transcript feed */}
      {transcripts.length > 0 && (
        <View style={styles.transcripts}>
          {transcripts.slice(-4).map((t, i) => (
            <ThemedText
              key={i}
              type="small"
              themeColor={t.role === 'user' ? 'text' : 'textSecondary'}
              style={styles.transcriptLine}
            >
              {t.role === 'user' ? '🎤 ' : '🔊 '}{t.text}
            </ThemedText>
          ))}
        </View>
      )}

      {/* Routing indicator */}
      {routingAgent && (state === 'processing' || state === 'speaking') && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.routingLabel}>
          Using {AGENT_LABEL[routingAgent] ?? routingAgent} agent
        </ThemedText>
      )}

      {/* Push-to-talk button */}
      <Pressable
        onPressIn={startRecording}
        onPressOut={stopRecording}
        onPress={state === 'idle' || state === 'error' ? connect : undefined}
        disabled={isLoading || state === 'speaking'}
        style={({ pressed }) => [
          styles.button,
          isActive && styles.buttonActive,
          (isLoading || state === 'speaking') && styles.buttonDisabled,
          pressed && canPress && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={STATE_LABEL[state]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonIcon}>
            {isActive ? '🎙' : '🎤'}
          </ThemedText>
        )}
      </Pressable>

      <ThemedText type="small" themeColor="textSecondary" style={styles.statusLabel}>
        {error ?? STATE_LABEL[state]}
      </ThemedText>
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BUTTON_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  transcripts: {
    gap: Spacing.one,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
  },
  transcriptLine: {
    textAlign: 'left',
  },
  routingLabel: {
    fontStyle: 'italic',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#6c63ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonActive: {
    backgroundColor: '#e53935',
    shadowColor: '#e53935',
    transform: [{ scale: 1.1 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
  },
  buttonIcon: {
    fontSize: 28,
  },
  statusLabel: {
    textAlign: 'center',
  },
});

import { GoogleGenAI } from '@google/genai';
import type { WebSocket } from 'ws';
import {
  runAgentTurn as runIosAgentTurn,
  resumeWithDeviceResults,
} from '../ios-agent/loop.js';
import { runAgentTurn as runGoogleAgentTurn } from '../google-agent/loop.js';
import { runAgentTurn as runMsAgentTurn } from '../microsoft-agent/loop.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ─── Routing tool ─────────────────────────────────────────────────────────────

const ROUTE_TOOL = {
  name: 'route_to_agent',
  description: `Route the user's request to the correct backend agent.

- 'ios'       — on-device iOS apps: Calendar, Reminders, Contacts, Photos, Files (iCloud), Health, Notifications.
- 'google'    — Google Workspace: Gmail, Google Calendar, Google Contacts, Google Tasks.
- 'microsoft' — Microsoft 365: Outlook Mail, Outlook Calendar, Teams channels, Teams chats.

Only call this function when you are confident which agent fits the request.
If the intent is ambiguous, ask one short clarifying question first — do not route yet.`,
  parameters: {
    type: 'object',
    properties: {
      agent: {
        type: 'string',
        enum: ['ios', 'google', 'microsoft'],
        description: 'The agent to route the request to.',
      },
      message: {
        type: 'string',
        description: "The user's request rewritten as a clear task instruction for the target agent.",
      },
    },
    required: ['agent', 'message'],
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingDeviceResolve = (results: unknown[]) => void;

export type VoiceSession = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  liveSession: any; // Session from @google/genai — avoid complex import
  agentSessionId: string;
  provider: string;
  accessToken: string | undefined;
  ws: WebSocket;
  pendingDevice: PendingDeviceResolve | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(ws: WebSocket, msg: object): void {
  if (ws.readyState === 1 /* OPEN */) ws.send(JSON.stringify(msg));
}

function buildSystemInstruction(): string {
  return `You are Luminate, a friendly voice assistant that helps users interact with their personal data.

When you clearly understand what the user wants, call route_to_agent to fulfil the request. Speak responses naturally and concisely — no bullet points or markdown, just conversational sentences.

If the user's intent is ambiguous (for example, you can't tell whether they mean Google Calendar or iOS Calendar), ask one short clarifying question. Never ask more than one question at a time.

Today is ${new Date().toISOString().slice(0, 10)}.`;
}

// ─── Session lifecycle ────────────────────────────────────────────────────────

export async function createVoiceSession(
  ws: WebSocket,
  provider: string,
  accessToken: string | undefined,
  agentSessionId: string,
): Promise<VoiceSession> {
  const state: VoiceSession = {
    liveSession: null,
    agentSessionId,
    provider,
    accessToken,
    ws,
    pendingDevice: null,
  };

  state.liveSession = await ai.live.connect({
    model: 'gemini-2.0-flash-live-001',
    config: {
      responseModalities: ['audio'] as any,
      systemInstruction: buildSystemInstruction(),
      tools: [{ functionDeclarations: [ROUTE_TOOL] }],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
      },
    },
    callbacks: {
      onopen: () => send(ws, { type: 'ready' }),
      onmessage: (msg: any) => handleLiveMessage(msg, state),
      onerror: (err: any) => {
        console.error('[voice] live error:', err);
        send(ws, { type: 'error', message: 'Voice session error.' });
      },
      onclose: () => {},
    },
  });

  return state;
}

export function destroyVoiceSession(session: VoiceSession): void {
  try {
    session.liveSession?.close();
  } catch {
    // ignore
  }
}

// ─── Client → session ────────────────────────────────────────────────────────

export async function handleClientMessage(
  session: VoiceSession,
  msg: any,
): Promise<void> {
  const { liveSession } = session;

  switch (msg.type) {
    case 'audio':
      // PCM16 audio chunk from the device microphone.
      // mimeType should be 'audio/pcm;rate=16000'.
      liveSession.sendRealtimeInput({
        audio: { data: msg.data, mimeType: msg.mimeType ?? 'audio/pcm;rate=16000' },
      });
      break;

    case 'audio_end':
      // User released the push-to-talk button.
      liveSession.sendRealtimeInput({ audioStreamEnd: true });
      break;

    case 'device_result':
      // iOS device tool results returned by the client.
      if (session.pendingDevice) {
        session.pendingDevice(msg.results);
        session.pendingDevice = null;
      }
      break;
  }
}

// ─── Session → client ────────────────────────────────────────────────────────

function handleLiveMessage(msg: any, session: VoiceSession): void {
  const { ws, liveSession, agentSessionId, provider, accessToken } = session;

  // What the user said (input transcription)
  const inputText: string | undefined = msg.serverContent?.inputTranscription?.text;
  if (inputText) send(ws, { type: 'input_transcription', text: inputText });

  // What the model is saying (output transcription)
  const outputText: string | undefined = msg.serverContent?.outputTranscription?.text;
  if (outputText) send(ws, { type: 'output_transcription', text: outputText });

  // Audio chunks from the model
  const parts: any[] = msg.serverContent?.modelTurn?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith('audio/')) {
      send(ws, {
        type: 'audio',
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      });
    }
  }

  // Model turn finished
  if (msg.serverContent?.turnComplete) {
    send(ws, { type: 'audio_complete' });
  }

  // Routing tool call
  const functionCalls: any[] = msg.toolCall?.functionCalls ?? [];
  for (const call of functionCalls) {
    if (call.name === 'route_to_agent') {
      const { agent, message } = call.args as { agent: string; message: string };
      send(ws, { type: 'routing', agent });

      dispatchToAgent(agent, message, agentSessionId, provider, accessToken, session)
        .then((response) => {
          liveSession.sendToolResponse({
            functionResponses: [{ id: call.id, name: call.name, response: { output: response } }],
          });
        })
        .catch((err) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error('[voice] agent dispatch error:', errMsg);
          liveSession.sendToolResponse({
            functionResponses: [{ id: call.id, name: call.name, response: { error: errMsg } }],
          });
        });
    }
  }
}

// ─── Agent dispatch ───────────────────────────────────────────────────────────

const DEVICE_RESULT_TIMEOUT_MS = 30_000;

async function dispatchToAgent(
  agent: string,
  message: string,
  sessionId: string,
  provider: string,
  accessToken: string | undefined,
  session: VoiceSession,
): Promise<string> {
  switch (agent) {
    case 'ios': {
      let result = await runIosAgentTurn(sessionId, message);

      // Loop through device tool rounds, delegating execution to the client.
      while (result.type === 'device_pending') {
        send(session.ws, { type: 'device_pending', calls: result.calls });

        const deviceResults = await Promise.race([
          new Promise<unknown[]>((resolve) => {
            session.pendingDevice = resolve;
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Device tool response timed out.')), DEVICE_RESULT_TIMEOUT_MS),
          ),
        ]);

        result = await resumeWithDeviceResults(sessionId, deviceResults);
      }

      return result.response;
    }

    case 'google': {
      if (!accessToken) throw new Error('No Google access token available.');
      const result = await runGoogleAgentTurn(sessionId, message, accessToken);
      return result.response;
    }

    case 'microsoft': {
      if (!accessToken) throw new Error('No Microsoft access token available.');
      const result = await runMsAgentTurn(sessionId, message, accessToken);
      return result.response;
    }

    default:
      throw new Error(`Unknown agent: ${agent}`);
  }
}

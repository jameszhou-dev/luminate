import { GoogleGenAI } from "@google/genai";
import { deviceToolDefinitions } from "./tools.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ─── Limits ──────────────────────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 8;
const MAX_HISTORY_MESSAGES = 40;
const MAX_TOOL_RESULT_CHARS = 4000;

// ─── Types ───────────────────────────────────────────────────────────────────

type Message = { role: "user" | "model"; parts: any[] };

export type DeviceCall = {
  tool: string;
  args: Record<string, unknown>;
};

export type DeviceToolResult = {
  tool: string;
  result: unknown;
};

// Final text response from the agent.
export type AgentResponse = {
  type: "response";
  response: string;
  sessionId: string;
};

// The agent needs the device to execute one or more tools before it can continue.
export type AgentDevicePending = {
  type: "device_pending";
  calls: DeviceCall[];
  sessionId: string;
};

export type AgentResult = AgentResponse | AgentDevicePending;

// ─── Session store ───────────────────────────────────────────────────────────

type SessionData = {
  history: Message[];
  toolRounds: number;
  seenCalls: Set<string>;
};

const sessions = new Map<string, SessionData>();

function getSession(sessionId: string): SessionData {
  return (
    sessions.get(sessionId) ?? {
      history: [],
      toolRounds: 0,
      seenCalls: new Set(),
    }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toolCallKey(name: string, args: Record<string, unknown>): string {
  return `${name}::${JSON.stringify(args, Object.keys(args ?? {}).sort())}`;
}

function truncate(value: unknown): string {
  const s = JSON.stringify(value);
  if (s.length <= MAX_TOOL_RESULT_CHARS) return s;
  return (
    s.slice(0, MAX_TOOL_RESULT_CHARS) +
    ` …[${s.length - MAX_TOOL_RESULT_CHARS} chars omitted]`
  );
}

function trimHistory(history: Message[]): Message[] {
  if (history.length <= MAX_HISTORY_MESSAGES) return history;
  const excess = history.length - MAX_HISTORY_MESSAGES;
  const drop = excess % 2 === 0 ? excess : excess + 1;
  return history.slice(drop);
}

function buildSystemInstruction(): string {
  return `You are a helpful personal assistant with access to the user's native iOS apps and data: Calendar, Reminders, Contacts, Photos, Files (iCloud Drive), Apple Health, and Notifications.
Be concise. Summarize lists rather than dumping raw data.
Before deleting events, reminders, files, or other irreversible actions, confirm with the user first.
When scheduling a notification, also create a reminder unless the user asks for only one.
If a tool fails, explain it plainly and suggest what to do next.
Today: ${new Date().toISOString()}.`;
}

// ─── Core loop ───────────────────────────────────────────────────────────────

async function runLoop(
  sessionId: string,
  session: SessionData,
): Promise<AgentResult> {
  while (true) {
    if (session.toolRounds >= MAX_TOOL_ROUNDS) {
      session.history.push({
        role: "user",
        parts: [
          {
            text: "You have used the maximum number of tool calls. Give the user a final response now using what you already know.",
          },
        ],
      });
      const final = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: trimHistory(session.history),
        config: {
          systemInstruction: buildSystemInstruction(),
          temperature: 0.2,
        },
      });
      const text =
        final.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text ??
        "";
      sessions.set(sessionId, session);
      return { type: "response", response: text, sessionId };
    }

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: trimHistory(session.history),
      config: {
        systemInstruction: buildSystemInstruction(),
        tools: [{ functionDeclarations: deviceToolDefinitions }],
        temperature: 0.2,
      },
    });

    const parts: any[] = result.candidates?.[0]?.content?.parts ?? [];
    session.history.push({ role: "model", parts });

    const calls = parts.filter((p) => p.functionCall);

    // No tool calls — final response.
    if (calls.length === 0) {
      sessions.set(sessionId, session);
      return {
        type: "response",
        response: parts.find((p: any) => p.text)?.text ?? "",
        sessionId,
      };
    }

    // ── Cycle detection ────────────────────────────────────────────────────
    const newCalls = calls.filter((p) => {
      const key = toolCallKey(p.functionCall.name, p.functionCall.args ?? {});
      if (session.seenCalls.has(key)) return false;
      session.seenCalls.add(key);
      return true;
    });

    if (newCalls.length === 0) {
      session.history.push({
        role: "user",
        parts: [
          {
            text: "You already called these tools with the same arguments. Respond to the user with what you know so far.",
          },
        ],
      });
      const recovery = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: trimHistory(session.history),
        config: {
          systemInstruction: buildSystemInstruction(),
          temperature: 0.2,
        },
      });
      const text =
        recovery.candidates?.[0]?.content?.parts?.find((p: any) => p.text)
          ?.text ?? "";
      sessions.set(sessionId, session);
      return { type: "response", response: text, sessionId };
    }

    // All tools execute on the device — pause and return them to the client.
    sessions.set(sessionId, session);
    return {
      type: "device_pending",
      calls: newCalls.map((p) => ({
        tool: p.functionCall.name,
        args: p.functionCall.args ?? {},
      })),
      sessionId,
    };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function runAgentTurn(
  sessionId: string,
  userMessage: string,
): Promise<AgentResult> {
  const session = getSession(sessionId);
  session.history.push({ role: "user", parts: [{ text: userMessage }] });
  return runLoop(sessionId, session);
}

export async function resumeWithDeviceResults(
  sessionId: string,
  deviceResults: DeviceToolResult[],
): Promise<AgentResult> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found.`);

  const resultParts = deviceResults.map((r) => ({
    functionResponse: {
      name: r.tool,
      response: { output: truncate(r.result) },
    },
  }));

  session.history.push({ role: "user", parts: resultParts });
  session.toolRounds++;

  return runLoop(sessionId, session);
}

export function clearSession(sessionId: string) {
  sessions.delete(sessionId);
}

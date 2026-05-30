import { GoogleGenAI } from '@google/genai';
import { toolDefinitions, executeTool } from './tools.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ─── Limits ──────────────────────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 8;
const MAX_HISTORY_MESSAGES = 40;
const MAX_TOOL_RESULT_CHARS = 4000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toolCallKey(name: string, args: Record<string, unknown>): string {
  return `${name}::${JSON.stringify(args, Object.keys(args ?? {}).sort())}`;
}

function truncate(value: unknown): string {
  const s = JSON.stringify(value);
  if (s.length <= MAX_TOOL_RESULT_CHARS) return s;
  const omitted = s.length - MAX_TOOL_RESULT_CHARS;
  return s.slice(0, MAX_TOOL_RESULT_CHARS) + ` …[${omitted} chars omitted]`;
}

function trimHistory(history: Message[]): Message[] {
  if (history.length <= MAX_HISTORY_MESSAGES) return history;
  const excess = history.length - MAX_HISTORY_MESSAGES;
  const drop = excess % 2 === 0 ? excess : excess + 1;
  return history.slice(drop);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Message = { role: 'user' | 'model'; parts: any[] };

// ─── Session store ───────────────────────────────────────────────────────────

const sessions = new Map<string, Message[]>();

// ─── System instruction ──────────────────────────────────────────────────────

function buildSystemInstruction(): string {
  return `You are a helpful personal assistant with access to the user's Microsoft 365 account (Outlook mail, Outlook calendar, Teams channels, Teams chats, and profile).
Be concise. Summarize lists rather than dumping raw data.
Before sending emails, deleting events, or other irreversible actions, confirm with the user first.
If a tool fails, explain it plainly and suggest what to do next.
Today: ${new Date().toISOString()}.`;
}

// ─── Agent loop ──────────────────────────────────────────────────────────────

export async function runAgentTurn(
  sessionId: string,
  userMessage: string,
  accessToken: string,
): Promise<{ response: string; sessionId: string }> {
  let history: Message[] = sessions.get(sessionId) ?? [];

  history.push({ role: 'user', parts: [{ text: userMessage }] });

  let toolRounds = 0;
  const seenCalls = new Set<string>();

  while (true) {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: trimHistory(history),
      config: {
        systemInstruction: buildSystemInstruction(),
        tools: [{ functionDeclarations: toolDefinitions }],
        temperature: 0.2,
      },
    });

    const parts: any[] = result.candidates?.[0]?.content?.parts ?? [];
    history.push({ role: 'model', parts });

    const calls = parts.filter((p) => p.functionCall);

    // No tool calls — final text response.
    if (calls.length === 0) {
      sessions.set(sessionId, history);
      return {
        response: parts.find((p) => p.text)?.text ?? '',
        sessionId,
      };
    }

    // ── Cycle detection ────────────────────────────────────────────────────
    const newCalls = calls.filter((p) => {
      const key = toolCallKey(p.functionCall.name, p.functionCall.args ?? {});
      if (seenCalls.has(key)) return false;
      seenCalls.add(key);
      return true;
    });

    if (newCalls.length === 0) {
      history.push({
        role: 'user',
        parts: [{ text: 'You already called these tools with the same arguments. Please respond to the user with what you know so far.' }],
      });
      const recovery = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: trimHistory(history),
        config: { systemInstruction: buildSystemInstruction(), temperature: 0.2 },
      });
      const recoveryText =
        recovery.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text ?? '';
      sessions.set(sessionId, history);
      return { response: recoveryText, sessionId };
    }

    // ── Round limit ────────────────────────────────────────────────────────
    if (toolRounds >= MAX_TOOL_ROUNDS) {
      history.push({
        role: 'user',
        parts: [{ text: 'You have used the maximum number of tool calls. Summarize what you found and give the user a final response now. Do not call any more tools.' }],
      });
      const final = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: trimHistory(history),
        config: { systemInstruction: buildSystemInstruction(), temperature: 0.2 },
      });
      const finalText =
        final.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text ?? '';
      sessions.set(sessionId, history);
      return { response: finalText, sessionId };
    }

    // ── Execute tool calls ─────────────────────────────────────────────────
    const toolResults = await Promise.all(
      calls.map(async (part) => {
        const { name, args } = part.functionCall;
        try {
          const output = await executeTool(name, args ?? {}, accessToken);
          return {
            functionResponse: {
              name,
              response: { output: truncate(output) },
            },
          };
        } catch (err) {
          return {
            functionResponse: {
              name,
              response: { error: err instanceof Error ? err.message : String(err) },
            },
          };
        }
      }),
    );

    history.push({ role: 'user', parts: toolResults });
    toolRounds++;
  }
}

export function clearSession(sessionId: string) {
  sessions.delete(sessionId);
}

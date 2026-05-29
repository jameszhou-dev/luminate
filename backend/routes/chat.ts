import { randomUUID } from "crypto";
import { Router } from "express";
import { clearSession, runAgentTurn } from "../google-agent/loop.js";

const router = Router();
ß;

// POST /chat
// Body: { message: string, accessToken: string, sessionId?: string }
router.post("/chat", async (req, res) => {
  const { message, accessToken, sessionId } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (!accessToken || typeof accessToken !== "string") {
    res.status(400).json({ error: "accessToken is required" });
    return;
  }

  const sid =
    sessionId && typeof sessionId === "string" ? sessionId : randomUUID();

  try {
    const result = await runAgentTurn(sid, message, accessToken);
    res.json(result);
  } catch (err) {
    console.error("[chat] agent error:", err);
    res.status(500).json({ error: "Agent error. Please try again." });
  }
});

// DELETE /chat/:sessionId — clear conversation history
router.delete("/chat/:sessionId", (req, res) => {
  clearSession(req.params.sessionId);
  res.json({ success: true });
});

export default router;

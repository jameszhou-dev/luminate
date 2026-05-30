import { randomUUID } from 'crypto';
import { Router } from 'express';
import { clearSession, runAgentTurn, resumeWithDeviceResults } from '../agent/loop.js';

const router = Router();

// POST /chat
// Body: { message: string, sessionId?: string }
router.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const sid = sessionId && typeof sessionId === 'string' ? sessionId : randomUUID();

  try {
    const result = await runAgentTurn(sid, message);
    res.json(result);
  } catch (err) {
    console.error('[chat] agent error:', err);
    res.status(500).json({ error: 'Agent error. Please try again.' });
  }
});

// POST /chat/device-result
// Body: { sessionId: string, results: { tool: string, result: unknown }[] }
router.post('/chat/device-result', async (req, res) => {
  const { sessionId, results } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }
  if (!Array.isArray(results)) {
    res.status(400).json({ error: 'results must be an array' });
    return;
  }

  try {
    const result = await resumeWithDeviceResults(sessionId, results);
    res.json(result);
  } catch (err) {
    console.error('[chat/device-result] error:', err);
    res.status(500).json({ error: 'Agent error. Please try again.' });
  }
});

// DELETE /chat/:sessionId — clear conversation history
router.delete('/chat/:sessionId', (req, res) => {
  clearSession(req.params.sessionId);
  res.json({ success: true });
});

export default router;

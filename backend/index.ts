import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import chatRouter from './routes/chat.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';
import {
  createVoiceSession,
  handleClientMessage,
  destroyVoiceSession,
  type VoiceSession,
} from './voice-agent/session.js';

const app = express();
app.use(express.json());
app.use(chatRouter);
app.use(usersRouter);
app.use(authRouter);

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/voice' });

wss.on('connection', (ws: WebSocket) => {
  let session: VoiceSession | null = null;

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'init') {
        session = await createVoiceSession(
          ws,
          msg.provider ?? 'ios',
          msg.accessToken,
          msg.sessionId ?? randomUUID(),
        );
      } else if (session) {
        await handleClientMessage(session, msg);
      }
    } catch (err) {
      console.error('[voice ws] error:', err);
    }
  });

  ws.on('close', () => {
    if (session) destroyVoiceSession(session);
  });

  ws.on('error', (err) => console.error('[voice ws] socket error:', err));
});

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => console.log(`Server listening on :${PORT}`));

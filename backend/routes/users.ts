import { Router } from 'express';
import { saveUserService, type ServiceData } from '../services/firestore.js';

const router = Router();

// POST /users/sync
// Body: { userId, provider, name, email, photo?, accessToken?, idToken?, refreshToken? }
router.post('/users/sync', async (req, res) => {
  const { userId, provider, name, email, photo, accessToken, idToken, refreshToken } = req.body;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }
  if (!provider || typeof provider !== 'string') {
    res.status(400).json({ error: 'provider is required' });
    return;
  }

  const data: ServiceData = {
    provider: provider as ServiceData['provider'],
    name: name ?? null,
    email: email ?? null,
    ...(photo !== undefined ? { photo } : {}),
    ...(accessToken ? { accessToken } : {}),
    ...(idToken ? { idToken } : {}),
    ...(refreshToken ? { refreshToken } : {}),
  };

  try {
    await saveUserService(userId, data);
    res.json({ success: true });
  } catch (err) {
    console.error('[users/sync] error:', err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

export default router;

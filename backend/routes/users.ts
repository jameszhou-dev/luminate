import { Router } from 'express';
import { saveUserService, updateUserPhoto, updateUserProfile, type ServiceData } from '../services/firestore.js';
import { verifyEmailPassword, updateEmailPassword } from '../services/email-auth.js';

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

// PATCH /users/:userId/profile
// Body: { name?, email? }
router.patch('/users/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const { name, email } = req.body;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    await updateUserProfile(userId, {
      ...(name !== undefined ? { name: name ?? null } : {}),
      ...(email !== undefined ? { email: typeof email === 'string' ? email.toLowerCase().trim() : null } : {}),
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[users/:userId/profile] error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /users/:userId/verify-password
// Body: { password }
router.post('/users/:userId/verify-password', async (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }
  if (!password) {
    res.status(400).json({ error: 'password is required' });
    return;
  }

  try {
    const valid = await verifyEmailPassword(userId, password);
    res.json({ valid });
  } catch (err) {
    console.error('[users/:userId/verify-password] error:', err);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// PATCH /users/:userId/password
// Body: { currentPassword, newPassword }
router.patch('/users/:userId/password', async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters.' });
    return;
  }

  try {
    await updateEmailPassword(userId, currentPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update password';
    res.status(400).json({ error: message });
  }
});

// PATCH /users/:userId/photo
// Body: { photoUrl: string | null }
router.patch('/users/:userId/photo', async (req, res) => {
  const { userId } = req.params;
  const { photoUrl } = req.body;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    await updateUserPhoto(userId, photoUrl ?? null);
    res.json({ success: true });
  } catch (err) {
    console.error('[users/:userId/photo] error:', err);
    res.status(500).json({ error: 'Failed to update photo' });
  }
});

export default router;

import { Router } from 'express';
import { signUpEmail, signInEmail } from '../services/email-auth.js';
import { db } from '../services/firestore.js';

const router = Router();

// POST /auth/check-email
// Body: { email }
// Returns: { exists: boolean }
router.post('/auth/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }
  const normalised = email.toLowerCase().trim();
  const snapshot = await db
    .collection('users')
    .where('email', '==', normalised)
    .limit(1)
    .get();
  res.json({ exists: !snapshot.empty });
});

// POST /auth/signup
// Body: { email, password, name? }
router.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }

  try {
    const result = await signUpEmail(email, password, name ?? null);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign up failed.';
    res.status(400).json({ error: message });
  }
});

// POST /auth/login
// Body: { email, password }
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required.' });
    return;
  }

  try {
    const result = await signInEmail(email, password);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign in failed.';
    res.status(401).json({ error: message });
  }
});

export default router;

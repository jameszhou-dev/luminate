import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { db } from './firestore.js';
import { generateAvatarUrl } from './avatar.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '90d';

export async function signUpEmail(
  email: string,
  password: string,
  name: string | null,
): Promise<{ token: string; userId: string }> {
  const normalised = email.toLowerCase().trim();

  const existing = await db
    .collection('users')
    .where('email', '==', normalised)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = randomUUID();

  await db.collection('users').doc(userId).set({
    name: name?.trim() || null,
    email: normalised,
    photo: generateAvatarUrl(name),
    passwordHash,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    services: {},
  });

  const token = jwt.sign({ userId, email: normalised }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });

  return { token, userId };
}

export async function verifyEmailPassword(userId: string, password: string): Promise<boolean> {
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return false;
  const data = doc.data()!;
  return bcrypt.compare(password, data.passwordHash ?? '');
}

export async function updateEmailPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) throw new Error('User not found.');
  const data = doc.data()!;
  const valid = await bcrypt.compare(currentPassword, data.passwordHash ?? '');
  if (!valid) throw new Error('Current password is incorrect.');
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await doc.ref.update({ passwordHash: newHash, updatedAt: FieldValue.serverTimestamp() });
}

export async function signInEmail(
  email: string,
  password: string,
): Promise<{ token: string; userId: string; name: string | null; photo: string | null }> {
  const normalised = email.toLowerCase().trim();

  const snapshot = await db
    .collection('users')
    .where('email', '==', normalised)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error('Invalid email or password.');
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  const passwordHash: string = data.passwordHash ?? '';

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password.');
  }

  await doc.ref.update({
    updatedAt: FieldValue.serverTimestamp(),
  });

  const token = jwt.sign(
    { userId: doc.id, email: normalised },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY },
  );

  return { token, userId: doc.id, name: data.name ?? null, photo: data.photo ?? null };
}

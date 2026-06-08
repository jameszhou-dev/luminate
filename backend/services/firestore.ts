import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateAvatarUrl } from './avatar.js';

if (getApps().length === 0) {
  if (process.env.FIREBASE_PROJECT_ID) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS (path to service-account JSON)
    // or Application Default Credentials when running on GCP.
    initializeApp();
  }
}

export const db = getFirestore();

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceData = {
  provider: 'google' | 'microsoft' | 'apple';
  name: string | null;
  email: string | null;
  photo?: string | null;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
};

// ─── Schema ───────────────────────────────────────────────────────────────────
//
// users/{userId}
//   name: string | null
//   photo: string | null       ← provider photo URL or custom upload URL
//   createdAt: Timestamp
//   updatedAt: Timestamp
//   services:
//     google?:    { name, email, photo, accessToken, idToken? }
//     microsoft?: { name, email, accessToken, refreshToken }
//     apple?:     { name, email }
//

export async function saveUserService(userId: string, data: ServiceData): Promise<void> {
  const ref = db.collection('users').doc(userId);

  const serviceFields: Record<string, unknown> = {
    name: data.name,
    email: data.email,
  };

  if (data.photo !== undefined) serviceFields.photo = data.photo;
  if (data.accessToken) serviceFields.accessToken = data.accessToken;
  if (data.idToken) serviceFields.idToken = data.idToken;
  if (data.refreshToken) serviceFields.refreshToken = data.refreshToken;

  // The photo to use: prefer the provider's photo, fall back to a generated avatar.
  const incomingPhoto = data.photo ?? generateAvatarUrl(data.name);

  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const existingPhoto = snap.exists ? (snap.data()?.photo ?? null) : null;

    const rootFields: Record<string, unknown> = {
      name: data.name,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      services: {
        [data.provider]: serviceFields,
      },
    };

    // Only write photo if the document has none yet — never overwrite a
    // custom photo set by the user or from a previous sign-in.
    if (!existingPhoto) {
      rootFields.photo = incomingPhoto;
    }

    t.set(ref, rootFields, { merge: true });
  });
}

export async function updateUserPhoto(userId: string, photoUrl: string | null): Promise<void> {
  await db.collection('users').doc(userId).update({
    photo: photoUrl,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string | null; email?: string | null },
): Promise<void> {
  const fields: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (data.name !== undefined) fields.name = data.name;
  if (data.email !== undefined) fields.email = data.email;
  await db.collection('users').doc(userId).update(fields);
}

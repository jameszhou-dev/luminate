import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

  await ref.set(
    {
      name: data.name,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      services: {
        [data.provider]: serviceFields,
      },
    },
    { merge: true },
  );
}

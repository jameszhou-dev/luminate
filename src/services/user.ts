const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export type SyncUserPayload = {
  userId: string;
  provider: string;
  name: string | null;
  email: string | null;
  photo?: string | null;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
};

export async function syncUser(payload: SyncUserPayload): Promise<void> {
  await fetch(`${BASE_URL}/users/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

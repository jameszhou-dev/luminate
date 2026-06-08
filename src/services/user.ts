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

export async function updateUserPhoto(userId: string, photoUrl: string | null): Promise<void> {
  await fetch(`${BASE_URL}/users/${userId}/photo`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoUrl }),
  });
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string | null; email?: string | null },
): Promise<void> {
  await fetch(`${BASE_URL}/users/${userId}/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/users/${userId}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.valid === true;
}

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${userId}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'Failed to update password');
  }
}

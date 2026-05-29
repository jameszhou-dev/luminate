// Thin wrappers over the Google REST APIs using the user's OAuth access token.
// The mobile app obtains this token via @react-native-google-signin/google-signin
// and passes it in each request body.

function gfetch(accessToken: string) {
  return async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google API error ${res.status}: ${body}`);
    }
    return res.json();
  };
}

// ─── Gmail ───────────────────────────────────────────────────────────────────

function decodeBody(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function encodeRaw(raw: string): string {
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function extractText(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) return decodeBody(payload.body.data);
  if (payload.parts) {
    const plain = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (plain?.body?.data) return decodeBody(plain.body.data);
    for (const part of payload.parts) {
      const t = extractText(part);
      if (t) return t;
    }
  }
  return '';
}

function hdr(msg: any, name: string): string {
  return msg.payload?.headers?.find((h: any) => h.name?.toLowerCase() === name)?.value ?? '';
}

function formatMessage(msg: any) {
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: hdr(msg, 'from'),
    to: hdr(msg, 'to'),
    subject: hdr(msg, 'subject'),
    date: hdr(msg, 'date'),
    snippet: msg.snippet ?? '',
    body: extractText(msg.payload),
    labelIds: msg.labelIds ?? [],
  };
}

export async function gmailListMessages(accessToken: string, query = '', maxResults = 20, labelIds?: string[]) {
  const get = gfetch(accessToken);
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  if (labelIds?.length) labelIds.forEach((id) => params.append('labelIds', id));
  const data = await get(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`);
  return (data.messages ?? []) as { id: string; threadId: string }[];
}

export async function gmailGetMessage(accessToken: string, id: string) {
  const get = gfetch(accessToken);
  const data = await get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`);
  return formatMessage(data);
}

export async function gmailSendMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
) {
  const get = gfetch(accessToken);
  const lines = [
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    ...(bcc ? [`Bcc: ${bcc}`] : []),
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ];
  return get('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: encodeRaw(lines.join('\r\n')) }),
  });
}

export async function gmailReplyToMessage(accessToken: string, id: string, body: string) {
  const get = gfetch(accessToken);
  const orig = await get(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`,
  );
  const from = hdr(orig, 'from');
  const subject = hdr(orig, 'subject');
  const msgId = hdr(orig, 'message-id');
  const refs = hdr(orig, 'references');
  const lines = [
    `To: ${from}`,
    `Subject: ${subject.startsWith('Re:') ? subject : `Re: ${subject}`}`,
    `In-Reply-To: ${msgId}`,
    `References: ${[refs, msgId].filter(Boolean).join(' ')}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ];
  return get('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: encodeRaw(lines.join('\r\n')), threadId: orig.threadId }),
  });
}

export async function gmailTrashMessage(accessToken: string, id: string) {
  const get = gfetch(accessToken);
  return get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`, { method: 'POST' });
}

export async function gmailModifyLabels(accessToken: string, id: string, addLabelIds: string[], removeLabelIds: string[]) {
  const get = gfetch(accessToken);
  return get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
    method: 'POST',
    body: JSON.stringify({ addLabelIds, removeLabelIds }),
  });
}

export async function gmailListLabels(accessToken: string) {
  const get = gfetch(accessToken);
  const data = await get('https://gmail.googleapis.com/gmail/v1/users/me/labels');
  return data.labels ?? [];
}

export async function gmailGetThread(accessToken: string, threadId: string) {
  const get = gfetch(accessToken);
  const data = await get(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`);
  return (data.messages ?? []).map(formatMessage);
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export async function calendarListEvents(accessToken: string, maxResults = 20, timeMin?: string, timeMax?: string, query?: string) {
  const get = gfetch(accessToken);
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: timeMin ?? new Date().toISOString(),
  });
  if (timeMax) params.set('timeMax', timeMax);
  if (query) params.set('q', query);
  const data = await get(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`);
  return data.items ?? [];
}

export async function calendarGetEvent(accessToken: string, eventId: string) {
  const get = gfetch(accessToken);
  return get(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`);
}

export async function calendarCreateEvent(accessToken: string, event: Record<string, unknown>) {
  const get = gfetch(accessToken);
  return get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function calendarUpdateEvent(accessToken: string, eventId: string, event: Record<string, unknown>) {
  const get = gfetch(accessToken);
  return get(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(event),
  });
}

export async function calendarDeleteEvent(accessToken: string, eventId: string) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) throw new Error(`Calendar delete error ${res.status}`);
  return { success: true };
}

// ─── Contacts ────────────────────────────────────────────────────────────────

const PERSON_FIELDS = 'names,emailAddresses,phoneNumbers,organizations';

export async function contactsList(accessToken: string, pageSize = 50) {
  const get = gfetch(accessToken);
  const params = new URLSearchParams({ personFields: PERSON_FIELDS, pageSize: String(pageSize) });
  const data = await get(`https://people.googleapis.com/v1/people/me/connections?${params}`);
  return data.connections ?? [];
}

export async function contactsSearch(accessToken: string, query: string) {
  const get = gfetch(accessToken);
  const params = new URLSearchParams({ query, readMask: PERSON_FIELDS });
  const data = await get(`https://people.googleapis.com/v1/people:searchContacts?${params}`);
  return (data.results ?? []).map((r: any) => r.person);
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function taskListLists(accessToken: string) {
  const get = gfetch(accessToken);
  const data = await get('https://tasks.googleapis.com/tasks/v1/users/@me/lists');
  return data.items ?? [];
}

export async function taskListTasks(accessToken: string, taskListId: string, showCompleted = false) {
  const get = gfetch(accessToken);
  const params = new URLSearchParams({ showCompleted: String(showCompleted) });
  const data = await get(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?${params}`);
  return data.items ?? [];
}

export async function taskCreate(accessToken: string, taskListId: string, title: string, notes?: string, due?: string) {
  const get = gfetch(accessToken);
  return get(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ title, ...(notes ? { notes } : {}), ...(due ? { due } : {}) }),
  });
}

export async function taskComplete(accessToken: string, taskListId: string, taskId: string) {
  const get = gfetch(accessToken);
  return get(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed' }),
  });
}

export async function taskDelete(accessToken: string, taskListId: string, taskId: string) {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Tasks delete error ${res.status}`);
  return { success: true };
}

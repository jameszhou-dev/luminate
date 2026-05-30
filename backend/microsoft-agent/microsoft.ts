// Thin wrappers over the Microsoft Graph REST API using the user's OAuth access token.
// The mobile app obtains this token via expo-auth-session and passes it in each request body.

const GRAPH = 'https://graph.microsoft.com/v1.0';

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
      throw new Error(`Graph API error ${res.status}: ${body}`);
    }
    // 204 No Content — return success sentinel
    if (res.status === 204) return { success: true };
    return res.json();
  };
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function profileGet(accessToken: string) {
  const get = gfetch(accessToken);
  return get(`${GRAPH}/me`);
}

// ─── Mail ────────────────────────────────────────────────────────────────────

function formatMessage(msg: any) {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    subject: msg.subject ?? '',
    from: msg.from?.emailAddress ?? null,
    toRecipients: (msg.toRecipients ?? []).map((r: any) => r.emailAddress),
    ccRecipients: (msg.ccRecipients ?? []).map((r: any) => r.emailAddress),
    receivedDateTime: msg.receivedDateTime,
    isRead: msg.isRead,
    bodyPreview: msg.bodyPreview ?? '',
    body: msg.body?.content ?? '',
  };
}

export async function mailListMessages(
  accessToken: string,
  folder = 'inbox',
  search?: string,
  maxResults = 20,
) {
  const get = gfetch(accessToken);
  const params = new URLSearchParams({
    $top: String(Math.min(maxResults, 50)),
    $orderby: 'receivedDateTime desc',
    $select: 'id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,bodyPreview,body',
  });
  if (search) params.set('$search', `"${search}"`);
  const data = await get(`${GRAPH}/me/mailFolders/${folder}/messages?${params}`);
  return (data.value ?? []).map(formatMessage);
}

export async function mailGetMessage(accessToken: string, id: string) {
  const get = gfetch(accessToken);
  const data = await get(`${GRAPH}/me/messages/${id}`);
  return formatMessage(data);
}

export async function mailSendMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
) {
  const get = gfetch(accessToken);
  const message: any = {
    subject,
    body: { contentType: 'Text', content: body },
    toRecipients: [{ emailAddress: { address: to } }],
  };
  if (cc) message.ccRecipients = [{ emailAddress: { address: cc } }];
  if (bcc) message.bccRecipients = [{ emailAddress: { address: bcc } }];
  return get(`${GRAPH}/me/sendMail`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function mailReplyToMessage(
  accessToken: string,
  id: string,
  body: string,
) {
  const get = gfetch(accessToken);
  return get(`${GRAPH}/me/messages/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message: { body: { contentType: 'Text', content: body } } }),
  });
}

export async function mailListFolders(accessToken: string) {
  const get = gfetch(accessToken);
  const data = await get(`${GRAPH}/me/mailFolders?$top=50`);
  return (data.value ?? []).map((f: any) => ({
    id: f.id,
    displayName: f.displayName,
    totalItemCount: f.totalItemCount,
    unreadItemCount: f.unreadItemCount,
  }));
}

// ─── Calendar ────────────────────────────────────────────────────────────────

function formatEvent(ev: any) {
  return {
    id: ev.id,
    subject: ev.subject,
    start: ev.start,
    end: ev.end,
    location: ev.location?.displayName ?? null,
    bodyPreview: ev.bodyPreview ?? '',
    isAllDay: ev.isAllDay,
    organizer: ev.organizer?.emailAddress ?? null,
    attendees: (ev.attendees ?? []).map((a: any) => ({
      email: a.emailAddress,
      status: a.status?.response,
    })),
    onlineMeetingUrl: ev.onlineMeetingUrl ?? null,
  };
}

export async function calendarListEvents(
  accessToken: string,
  maxResults = 20,
  startDateTime?: string,
  endDateTime?: string,
) {
  const get = gfetch(accessToken);
  const start = startDateTime ?? new Date().toISOString();
  const params = new URLSearchParams({
    startDateTime: start,
    $top: String(Math.min(maxResults, 50)),
    $orderby: 'start/dateTime',
    $select: 'id,subject,start,end,location,bodyPreview,isAllDay,organizer,attendees,onlineMeetingUrl',
  });
  if (endDateTime) params.set('endDateTime', endDateTime);
  const data = await get(`${GRAPH}/me/calendarView?${params}`);
  return (data.value ?? []).map(formatEvent);
}

export async function calendarGetEvent(accessToken: string, id: string) {
  const get = gfetch(accessToken);
  const data = await get(`${GRAPH}/me/events/${id}`);
  return formatEvent(data);
}

export async function calendarListCalendars(accessToken: string) {
  const get = gfetch(accessToken);
  const data = await get(`${GRAPH}/me/calendars?$select=id,name,isDefaultCalendar,canEdit`);
  return data.value ?? [];
}

export async function calendarCreateEvent(
  accessToken: string,
  event: Record<string, unknown>,
) {
  const get = gfetch(accessToken);
  return get(`${GRAPH}/me/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function calendarUpdateEvent(
  accessToken: string,
  id: string,
  updates: Record<string, unknown>,
) {
  const get = gfetch(accessToken);
  return get(`${GRAPH}/me/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function calendarDeleteEvent(accessToken: string, id: string) {
  const res = await fetch(`${GRAPH}/me/events/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Calendar delete error ${res.status}`);
  return { success: true };
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export async function teamsListJoinedTeams(accessToken: string) {
  const get = gfetch(accessToken);
  const data = await get(`${GRAPH}/me/joinedTeams?$select=id,displayName,description`);
  return data.value ?? [];
}

export async function teamsListChannels(accessToken: string, teamId: string) {
  const get = gfetch(accessToken);
  const data = await get(
    `${GRAPH}/teams/${teamId}/channels?$select=id,displayName,description`,
  );
  return data.value ?? [];
}

export async function teamsListChannelMessages(
  accessToken: string,
  teamId: string,
  channelId: string,
  maxResults = 20,
) {
  const get = gfetch(accessToken);
  const data = await get(
    `${GRAPH}/teams/${teamId}/channels/${channelId}/messages?$top=${Math.min(maxResults, 50)}`,
  );
  return (data.value ?? []).map((m: any) => ({
    id: m.id,
    createdDateTime: m.createdDateTime,
    from: m.from?.user ?? m.from?.application ?? null,
    body: m.body?.content ?? '',
    contentType: m.body?.contentType,
    replyToId: m.replyToId ?? null,
  }));
}

// ─── Chats ───────────────────────────────────────────────────────────────────

export async function chatsListChats(accessToken: string) {
  const get = gfetch(accessToken);
  const data = await get(
    `${GRAPH}/me/chats?$expand=members&$select=id,chatType,topic,createdDateTime,lastUpdatedDateTime`,
  );
  return (data.value ?? []).map((c: any) => ({
    id: c.id,
    chatType: c.chatType,
    topic: c.topic ?? null,
    lastUpdatedDateTime: c.lastUpdatedDateTime,
    members: (c.members ?? []).map((m: any) => m.displayName ?? m.email),
  }));
}

export async function chatsListMessages(
  accessToken: string,
  chatId: string,
  maxResults = 20,
) {
  const get = gfetch(accessToken);
  const data = await get(
    `${GRAPH}/me/chats/${chatId}/messages?$top=${Math.min(maxResults, 50)}`,
  );
  return (data.value ?? []).map((m: any) => ({
    id: m.id,
    createdDateTime: m.createdDateTime,
    from: m.from?.user ?? m.from?.application ?? null,
    body: m.body?.content ?? '',
    contentType: m.body?.contentType,
  }));
}

import { getContacts, getContact } from './device-contacts';
import {
  getCalendars,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getReminderLists,
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
} from './device-calendar';
import {
  requestContactsPermission,
  getContactsPermission,
} from './device-contacts';
import {
  requestCalendarPermission,
  requestRemindersPermission,
  getCalendarPermission,
  getRemindersPermission,
} from './device-calendar';
import {
  listPhotos,
  listAlbums,
  requestPhotosPermission,
  getPhotosPermission,
} from './device-photos';
import {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  pickAndReadFile,
} from './device-files';
import {
  getSteps,
  getHeartRate,
  getSleep,
  getWorkouts,
} from './device-health';
import {
  scheduleNotification,
  listScheduledNotifications,
  cancelNotification,
  cancelAllNotifications,
  requestNotificationsPermission,
  getNotificationsPermission,
} from './device-notifications';

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Device tool executor ────────────────────────────────────────────────────

async function ensurePermission(
  check: () => Promise<string>,
  request: () => Promise<boolean>,
): Promise<void> {
  const status = await check();
  if (status !== 'granted') {
    const granted = await request();
    if (!granted) throw new Error('Permission denied by user.');
  }
}

async function executeDeviceTool(tool: string, args: Record<string, unknown>): Promise<unknown> {
  switch (tool) {
    // ── Contacts ────────────────────────────────────────────────────────────
    case 'device_list_contacts':
      await ensurePermission(getContactsPermission, requestContactsPermission);
      return getContacts(args.query as string | undefined);

    case 'device_get_contact':
      await ensurePermission(getContactsPermission, requestContactsPermission);
      return getContact(args.id as string);

    // ── Calendar ────────────────────────────────────────────────────────────
    case 'device_list_calendars':
      await ensurePermission(getCalendarPermission, requestCalendarPermission);
      return getCalendars();

    case 'device_list_events':
      await ensurePermission(getCalendarPermission, requestCalendarPermission);
      return getEvents(
        new Date(args.startDate as string),
        new Date(args.endDate as string),
        args.calendarIds as string[] | undefined,
      );

    case 'device_create_event':
      await ensurePermission(getCalendarPermission, requestCalendarPermission);
      return createEvent(args.calendarId as string, {
        title: args.title as string,
        startDate: new Date(args.startDate as string),
        endDate: new Date(args.endDate as string),
        location: args.location as string | undefined,
        notes: args.notes as string | undefined,
        allDay: args.allDay as boolean | undefined,
      });

    case 'device_update_event':
      await ensurePermission(getCalendarPermission, requestCalendarPermission);
      return updateEvent(args.id as string, {
        ...(args.title ? { title: args.title as string } : {}),
        ...(args.startDate ? { startDate: new Date(args.startDate as string) } : {}),
        ...(args.endDate ? { endDate: new Date(args.endDate as string) } : {}),
        ...(args.location ? { location: args.location as string } : {}),
        ...(args.notes ? { notes: args.notes as string } : {}),
      });

    case 'device_delete_event':
      await ensurePermission(getCalendarPermission, requestCalendarPermission);
      return deleteEvent(args.id as string);

    // ── Reminders ───────────────────────────────────────────────────────────
    case 'device_list_reminder_lists':
      await ensurePermission(getRemindersPermission, requestRemindersPermission);
      return getReminderLists();

    case 'device_list_reminders':
      await ensurePermission(getRemindersPermission, requestRemindersPermission);
      return getReminders(
        args.listIds as string[] | undefined,
        args.startDate ? new Date(args.startDate as string) : undefined,
        args.endDate ? new Date(args.endDate as string) : undefined,
      );

    case 'device_create_reminder':
      await ensurePermission(getRemindersPermission, requestRemindersPermission);
      return createReminder(args.listId as string, {
        title: args.title as string,
        ...(args.notes ? { notes: args.notes as string } : {}),
        ...(args.dueDate ? { dueDate: new Date(args.dueDate as string) } : {}),
      });

    case 'device_complete_reminder':
      await ensurePermission(getRemindersPermission, requestRemindersPermission);
      return updateReminder(args.id as string, { completed: true });

    case 'device_delete_reminder':
      await ensurePermission(getRemindersPermission, requestRemindersPermission);
      return deleteReminder(args.id as string);

    // ── Photos ──────────────────────────────────────────────────────────────
    case 'device_list_photos':
      await ensurePermission(getPhotosPermission, requestPhotosPermission);
      return listPhotos({
        first: args.first as number | undefined,
        after: args.after as string | undefined,
        albumId: args.albumId as string | undefined,
        mediaType: args.mediaType as 'photo' | 'video' | undefined,
        createdAfter: args.createdAfter ? new Date(args.createdAfter as string) : undefined,
        createdBefore: args.createdBefore ? new Date(args.createdBefore as string) : undefined,
      });

    case 'device_list_photo_albums':
      await ensurePermission(getPhotosPermission, requestPhotosPermission);
      return listAlbums();

    // ── Files ────────────────────────────────────────────────────────────────
    case 'device_list_files':
      return listFiles();

    case 'device_read_file':
      return readFile(args.filename as string);

    case 'device_write_file':
      await writeFile(args.filename as string, args.content as string);
      return { success: true };

    case 'device_delete_file':
      await deleteFile(args.filename as string);
      return { success: true };

    case 'device_pick_file':
      return pickAndReadFile();

    // ── Health ───────────────────────────────────────────────────────────────
    case 'device_get_steps':
      return getSteps(new Date(args.startDate as string), new Date(args.endDate as string));

    case 'device_get_heart_rate':
      return getHeartRate(new Date(args.startDate as string), new Date(args.endDate as string));

    case 'device_get_sleep':
      return getSleep(new Date(args.startDate as string), new Date(args.endDate as string));

    case 'device_get_workouts':
      return getWorkouts(new Date(args.startDate as string), new Date(args.endDate as string));

    // ── Notifications ────────────────────────────────────────────────────────
    case 'device_schedule_notification':
      await ensurePermission(getNotificationsPermission, requestNotificationsPermission);
      return scheduleNotification({
        title: args.title as string,
        body: args.body as string,
        scheduledDate: new Date(args.scheduledDate as string),
      });

    case 'device_list_notifications':
      return listScheduledNotifications();

    case 'device_cancel_notification':
      await cancelNotification(args.id as string);
      return { success: true };

    case 'device_cancel_all_notifications':
      await cancelAllNotifications();
      return { success: true };

    default:
      throw new Error(`Unknown device tool: ${tool}`);
  }
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function post(path: string, body: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type ChatResult = {
  response: string;
  sessionId: string;
};

/**
 * Send a message to the agent and run the full tool-execution loop,
 * including any device tools that need to be executed locally.
 */
export async function sendMessage(
  message: string,
  sessionId?: string,
): Promise<ChatResult> {
  let currentSessionId = sessionId;

  // Start the conversation.
  let agentResult = await post('/chat', { message, sessionId: currentSessionId });
  currentSessionId = agentResult.sessionId;

  // Loop until the agent gives a final text response.
  while (agentResult.type === 'device_pending') {
    const calls: { tool: string; args: Record<string, unknown> }[] = agentResult.calls;

    // Execute all device tools in parallel.
    const results = await Promise.all(
      calls.map(async ({ tool, args }) => {
        try {
          const result = await executeDeviceTool(tool, args);
          return { tool, result };
        } catch (err) {
          return { tool, result: { error: err instanceof Error ? err.message : String(err) } };
        }
      }),
    );

    // Send results back and continue.
    agentResult = await post('/chat/device-result', { sessionId: currentSessionId, results });
  }

  return { response: agentResult.response, sessionId: currentSessionId };
}

export async function clearSession(sessionId: string): Promise<void> {
  await fetch(`${BASE_URL}/chat/${sessionId}`, { method: 'DELETE' });
}

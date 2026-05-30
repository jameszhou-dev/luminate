import * as Calendar from 'expo-calendar';

// ─── Permissions ─────────────────────────────────────────────────────────────

export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function requestRemindersPermission(): Promise<boolean> {
  const { status } = await Calendar.requestRemindersPermissionsAsync();
  return status === 'granted';
}

export async function getCalendarPermission(): Promise<Calendar.PermissionStatus> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status;
}

export async function getRemindersPermission(): Promise<Calendar.PermissionStatus> {
  const { status } = await Calendar.getRemindersPermissionsAsync();
  return status;
}

// ─── Calendars ───────────────────────────────────────────────────────────────

export async function getCalendars(): Promise<Calendar.Calendar[]> {
  return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function getEvents(
  startDate: Date,
  endDate: Date,
  calendarIds?: string[],
): Promise<Calendar.Event[]> {
  const ids = calendarIds ?? (await getCalendars()).map((c) => c.id);
  return Calendar.getEventsAsync(ids, startDate, endDate);
}

export async function createEvent(
  calendarId: string,
  details: Partial<Calendar.Event>,
): Promise<string> {
  return Calendar.createEventAsync(calendarId, details);
}

export async function updateEvent(
  id: string,
  details: Partial<Calendar.Event>,
): Promise<void> {
  await Calendar.updateEventAsync(id, details);
}

export async function deleteEvent(id: string): Promise<void> {
  await Calendar.deleteEventAsync(id);
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export async function getReminderLists(): Promise<Calendar.Calendar[]> {
  return Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
}

export async function getReminders(
  listIds?: string[],
  startDate?: Date,
  endDate?: Date,
): Promise<Calendar.Reminder[]> {
  const ids = listIds ?? (await getReminderLists()).map((l) => l.id);
  return Calendar.getRemindersAsync(
    ids,
    null,
    startDate ?? null,
    endDate ?? null,
  );
}

export async function createReminder(
  listId: string,
  details: Partial<Calendar.Reminder>,
): Promise<string> {
  return Calendar.createReminderAsync(listId, details);
}

export async function updateReminder(
  id: string,
  details: Partial<Calendar.Reminder>,
): Promise<void> {
  await Calendar.updateReminderAsync(id, details);
}

export async function deleteReminder(id: string): Promise<void> {
  await Calendar.deleteReminderAsync(id);
}

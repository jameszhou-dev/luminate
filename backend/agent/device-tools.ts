import type { FunctionDeclaration } from '@google/genai';

// Tool names that must be executed on the device (not the backend).
export const DEVICE_TOOLS = new Set([
  // Contacts
  'device_list_contacts',
  'device_get_contact',
  // Calendar
  'device_list_calendars',
  'device_list_events',
  'device_create_event',
  'device_update_event',
  'device_delete_event',
  // Reminders
  'device_list_reminder_lists',
  'device_list_reminders',
  'device_create_reminder',
  'device_complete_reminder',
  'device_delete_reminder',
  // Photos
  'device_list_photos',
  'device_list_photo_albums',
  // Files
  'device_list_files',
  'device_read_file',
  'device_write_file',
  'device_delete_file',
  'device_pick_file',
  // Health
  'device_get_steps',
  'device_get_heart_rate',
  'device_get_sleep',
  'device_get_workouts',
  // Notifications
  'device_schedule_notification',
  'device_list_notifications',
  'device_cancel_notification',
  'device_cancel_all_notifications',
]);

export const deviceToolDefinitions: FunctionDeclaration[] = [
  // ── Contacts ──────────────────────────────────────────────────────────────
  {
    name: 'device_list_contacts',
    description: "List or search the user's native iOS Contacts.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional name search query' },
      },
    },
  },
  {
    name: 'device_get_contact',
    description: 'Get full details for a contact by ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Contact ID' },
      },
      required: ['id'],
    },
  },

  // ── Calendar ──────────────────────────────────────────────────────────────
  {
    name: 'device_list_calendars',
    description: "List the user's native iOS calendars.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'device_list_events',
    description: 'List events from the native iOS Calendar within a date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO 8601 start date' },
        endDate: { type: 'string', description: 'ISO 8601 end date' },
        calendarIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of calendar IDs to filter by',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'device_create_event',
    description: 'Create an event in the native iOS Calendar.',
    parameters: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'Calendar ID to add the event to' },
        title: { type: 'string', description: 'Event title' },
        startDate: { type: 'string', description: 'ISO 8601 start date/time' },
        endDate: { type: 'string', description: 'ISO 8601 end date/time' },
        location: { type: 'string', description: 'Optional location' },
        notes: { type: 'string', description: 'Optional notes' },
        allDay: { type: 'boolean', description: 'Whether the event is all-day' },
      },
      required: ['calendarId', 'title', 'startDate', 'endDate'],
    },
  },
  {
    name: 'device_update_event',
    description: 'Update an existing native iOS Calendar event.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Event ID' },
        title: { type: 'string', description: 'New title (optional)' },
        startDate: { type: 'string', description: 'New start date/time (optional)' },
        endDate: { type: 'string', description: 'New end date/time (optional)' },
        location: { type: 'string', description: 'New location (optional)' },
        notes: { type: 'string', description: 'New notes (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'device_delete_event',
    description: 'Delete a native iOS Calendar event.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Event ID to delete' },
      },
      required: ['id'],
    },
  },

  // ── Reminders ─────────────────────────────────────────────────────────────
  {
    name: 'device_list_reminder_lists',
    description: "List the user's native iOS Reminders lists.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'device_list_reminders',
    description: 'List reminders from the native iOS Reminders app.',
    parameters: {
      type: 'object',
      properties: {
        listIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional reminder list IDs to filter by',
        },
        startDate: { type: 'string', description: 'Optional ISO 8601 start date' },
        endDate: { type: 'string', description: 'Optional ISO 8601 end date' },
      },
    },
  },
  {
    name: 'device_create_reminder',
    description: 'Create a reminder in the native iOS Reminders app.',
    parameters: {
      type: 'object',
      properties: {
        listId: { type: 'string', description: 'Reminder list ID' },
        title: { type: 'string', description: 'Reminder title' },
        notes: { type: 'string', description: 'Optional notes' },
        dueDate: { type: 'string', description: 'Optional ISO 8601 due date' },
      },
      required: ['listId', 'title'],
    },
  },
  {
    name: 'device_complete_reminder',
    description: 'Mark a native iOS reminder as completed.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Reminder ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'device_delete_reminder',
    description: 'Delete a native iOS reminder.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Reminder ID' },
      },
      required: ['id'],
    },
  },

  // ── Photos ────────────────────────────────────────────────────────────────
  {
    name: 'device_list_photos',
    description: "List photo and video assets from the user's native iOS Photos library.",
    parameters: {
      type: 'object',
      properties: {
        first: { type: 'number', description: 'Number of assets to return (default 20)' },
        after: { type: 'string', description: 'Pagination cursor from a previous call' },
        albumId: { type: 'string', description: 'Optional album ID to filter by' },
        mediaType: {
          type: 'string',
          description: 'Filter by media type: "photo" or "video"',
        },
        createdAfter: { type: 'string', description: 'Optional ISO 8601 start date' },
        createdBefore: { type: 'string', description: 'Optional ISO 8601 end date' },
      },
    },
  },
  {
    name: 'device_list_photo_albums',
    description: "List albums in the user's native iOS Photos library.",
    parameters: { type: 'object', properties: {} },
  },

  // ── Files ─────────────────────────────────────────────────────────────────
  {
    name: 'device_list_files',
    description: "List files stored in the app's document directory (syncs to iCloud Drive).",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'device_read_file',
    description: "Read the text content of a file from the app's document directory.",
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename to read' },
      },
      required: ['filename'],
    },
  },
  {
    name: 'device_write_file',
    description: "Create or overwrite a text file in the app's document directory.",
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename to write' },
        content: { type: 'string', description: 'Text content to write' },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'device_delete_file',
    description: "Delete a file from the app's document directory.",
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename to delete' },
      },
      required: ['filename'],
    },
  },
  {
    name: 'device_pick_file',
    description: 'Open the system file picker so the user can choose a file from iCloud Drive or the device. Returns the file name and text content.',
    parameters: { type: 'object', properties: {} },
  },

  // ── Health ────────────────────────────────────────────────────────────────
  {
    name: 'device_get_steps',
    description: "Get the user's daily step count from Apple Health.",
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO 8601 start date' },
        endDate: { type: 'string', description: 'ISO 8601 end date' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'device_get_heart_rate',
    description: "Get heart rate samples from Apple Health.",
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO 8601 start date' },
        endDate: { type: 'string', description: 'ISO 8601 end date' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'device_get_sleep',
    description: "Get sleep analysis data from Apple Health.",
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO 8601 start date' },
        endDate: { type: 'string', description: 'ISO 8601 end date' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'device_get_workouts',
    description: "Get workout history from Apple Health.",
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO 8601 start date' },
        endDate: { type: 'string', description: 'ISO 8601 end date' },
      },
      required: ['startDate', 'endDate'],
    },
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  {
    name: 'device_schedule_notification',
    description: 'Schedule a local notification to appear at a specific date and time.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Notification title' },
        body: { type: 'string', description: 'Notification body text' },
        scheduledDate: { type: 'string', description: 'ISO 8601 date/time to deliver the notification' },
      },
      required: ['title', 'body', 'scheduledDate'],
    },
  },
  {
    name: 'device_list_notifications',
    description: 'List all pending scheduled local notifications.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'device_cancel_notification',
    description: 'Cancel a pending scheduled notification by its ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Notification identifier to cancel' },
      },
      required: ['id'],
    },
  },
  {
    name: 'device_cancel_all_notifications',
    description: 'Cancel all pending scheduled notifications.',
    parameters: { type: 'object', properties: {} },
  },
];

import type { FunctionDeclaration } from '@google/genai';
import * as G from './google.js';

// ─── Definitions (sent to Gemini) ────────────────────────────────────────────

export const toolDefinitions: FunctionDeclaration[] = [
  // Gmail
  {
    name: 'gmail_list_messages',
    description: 'List Gmail messages. Use a query to filter results.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gmail search query, e.g. "is:unread from:alice"' },
        maxResults: { type: 'integer', description: 'Max messages to return (default 20, max 50)' },
      },
    },
  },
  {
    name: 'gmail_get_message',
    description: 'Fetch the full content of a Gmail message by its ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Message ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'gmail_send_message',
    description: 'Compose and send a new email.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Plain-text email body' },
        cc: { type: 'string', description: 'CC email address (optional)' },
        bcc: { type: 'string', description: 'BCC email address (optional)' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'gmail_reply_to_message',
    description: 'Reply to an existing email thread.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the message to reply to' },
        body: { type: 'string', description: 'Plain-text reply body' },
      },
      required: ['id', 'body'],
    },
  },
  {
    name: 'gmail_trash_message',
    description: 'Move a Gmail message to the trash.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Message ID to trash' },
      },
      required: ['id'],
    },
  },
  {
    name: 'gmail_get_thread',
    description: 'Fetch all messages in a Gmail thread.',
    parameters: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Thread ID' },
      },
      required: ['threadId'],
    },
  },
  {
    name: 'gmail_list_labels',
    description: 'List all Gmail labels (inbox, sent, custom labels, etc.).',
    parameters: { type: 'object', properties: {} },
  },

  // Calendar
  {
    name: 'calendar_list_events',
    description: 'List upcoming Google Calendar events.',
    parameters: {
      type: 'object',
      properties: {
        maxResults: { type: 'integer', description: 'Max events to return (default 20)' },
        timeMin: { type: 'string', description: 'Start time in RFC3339 format (default: now)' },
        timeMax: { type: 'string', description: 'End time in RFC3339 format (optional)' },
        query: { type: 'string', description: 'Search query to filter events (optional)' },
      },
    },
  },
  {
    name: 'calendar_get_event',
    description: 'Get details of a specific calendar event by ID.',
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Calendar event ID' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'calendar_create_event',
    description: 'Create a new calendar event.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Event title' },
        description: { type: 'string', description: 'Event description (optional)' },
        location: { type: 'string', description: 'Event location (optional)' },
        startDateTime: { type: 'string', description: 'Start time in RFC3339 format, e.g. 2025-06-01T10:00:00-07:00' },
        endDateTime: { type: 'string', description: 'End time in RFC3339 format' },
        attendeeEmails: { type: 'array', items: { type: 'string' }, description: 'List of attendee emails (optional)' },
        addMeetLink: { type: 'boolean', description: 'Whether to add a Google Meet video link (optional)' },
      },
      required: ['summary', 'startDateTime', 'endDateTime'],
    },
  },
  {
    name: 'calendar_update_event',
    description: 'Update an existing calendar event.',
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Event ID to update' },
        summary: { type: 'string', description: 'New title (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        location: { type: 'string', description: 'New location (optional)' },
        startDateTime: { type: 'string', description: 'New start time in RFC3339 format (optional)' },
        endDateTime: { type: 'string', description: 'New end time in RFC3339 format (optional)' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'calendar_delete_event',
    description: 'Delete a calendar event.',
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Event ID to delete' },
      },
      required: ['eventId'],
    },
  },

  // Contacts
  {
    name: 'contacts_list',
    description: 'List the user\'s Google contacts.',
    parameters: {
      type: 'object',
      properties: {
        pageSize: { type: 'integer', description: 'Number of contacts to return (default 50)' },
      },
    },
  },
  {
    name: 'contacts_search',
    description: 'Search Google contacts by name or email.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },

  // Tasks
  {
    name: 'tasks_list_lists',
    description: 'List all Google Task lists.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'tasks_list_tasks',
    description: 'List tasks in a specific task list.',
    parameters: {
      type: 'object',
      properties: {
        taskListId: { type: 'string', description: 'Task list ID' },
        showCompleted: { type: 'boolean', description: 'Include completed tasks (default false)' },
      },
      required: ['taskListId'],
    },
  },
  {
    name: 'tasks_create',
    description: 'Create a new task in a task list.',
    parameters: {
      type: 'object',
      properties: {
        taskListId: { type: 'string', description: 'Task list ID' },
        title: { type: 'string', description: 'Task title' },
        notes: { type: 'string', description: 'Task notes (optional)' },
        due: { type: 'string', description: 'Due date in RFC3339 format (optional)' },
      },
      required: ['taskListId', 'title'],
    },
  },
  {
    name: 'tasks_complete',
    description: 'Mark a task as completed.',
    parameters: {
      type: 'object',
      properties: {
        taskListId: { type: 'string', description: 'Task list ID' },
        taskId: { type: 'string', description: 'Task ID' },
      },
      required: ['taskListId', 'taskId'],
    },
  },
  {
    name: 'tasks_delete',
    description: 'Delete a task.',
    parameters: {
      type: 'object',
      properties: {
        taskListId: { type: 'string', description: 'Task list ID' },
        taskId: { type: 'string', description: 'Task ID' },
      },
      required: ['taskListId', 'taskId'],
    },
  },
];

// ─── Executor ────────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, any>,
  accessToken: string,
): Promise<unknown> {
  switch (name) {
    // Gmail
    case 'gmail_list_messages':
      return G.gmailListMessages(accessToken, args.query, args.maxResults);
    case 'gmail_get_message':
      return G.gmailGetMessage(accessToken, args.id);
    case 'gmail_send_message':
      return G.gmailSendMessage(accessToken, args.to, args.subject, args.body, args.cc, args.bcc);
    case 'gmail_reply_to_message':
      return G.gmailReplyToMessage(accessToken, args.id, args.body);
    case 'gmail_trash_message':
      return G.gmailTrashMessage(accessToken, args.id);
    case 'gmail_get_thread':
      return G.gmailGetThread(accessToken, args.threadId);
    case 'gmail_list_labels':
      return G.gmailListLabels(accessToken);

    // Calendar
    case 'calendar_list_events':
      return G.calendarListEvents(accessToken, args.maxResults, args.timeMin, args.timeMax, args.query);
    case 'calendar_get_event':
      return G.calendarGetEvent(accessToken, args.eventId);
    case 'calendar_create_event': {
      const event: Record<string, unknown> = {
        summary: args.summary,
        start: { dateTime: args.startDateTime },
        end: { dateTime: args.endDateTime },
        ...(args.description ? { description: args.description } : {}),
        ...(args.location ? { location: args.location } : {}),
        ...(args.attendeeEmails?.length
          ? { attendees: args.attendeeEmails.map((e: string) => ({ email: e })) }
          : {}),
        ...(args.addMeetLink ? { conferenceData: { createRequest: { requestId: crypto.randomUUID() } } } : {}),
      };
      const params = args.addMeetLink ? '?conferenceDataVersion=1' : '';
      return G.calendarCreateEvent(accessToken, event);
    }
    case 'calendar_update_event': {
      const updates: Record<string, unknown> = {};
      if (args.summary) updates.summary = args.summary;
      if (args.description) updates.description = args.description;
      if (args.location) updates.location = args.location;
      if (args.startDateTime) updates.start = { dateTime: args.startDateTime };
      if (args.endDateTime) updates.end = { dateTime: args.endDateTime };
      return G.calendarUpdateEvent(accessToken, args.eventId, updates);
    }
    case 'calendar_delete_event':
      return G.calendarDeleteEvent(accessToken, args.eventId);

    // Contacts
    case 'contacts_list':
      return G.contactsList(accessToken, args.pageSize);
    case 'contacts_search':
      return G.contactsSearch(accessToken, args.query);

    // Tasks
    case 'tasks_list_lists':
      return G.taskListLists(accessToken);
    case 'tasks_list_tasks':
      return G.taskListTasks(accessToken, args.taskListId, args.showCompleted);
    case 'tasks_create':
      return G.taskCreate(accessToken, args.taskListId, args.title, args.notes, args.due);
    case 'tasks_complete':
      return G.taskComplete(accessToken, args.taskListId, args.taskId);
    case 'tasks_delete':
      return G.taskDelete(accessToken, args.taskListId, args.taskId);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

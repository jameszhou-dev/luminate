import type { FunctionDeclaration } from "@google/genai";
import * as G from "./microsoft.js";

// ─── Definitions (sent to Gemini) ────────────────────────────────────────────

export const toolDefinitions: FunctionDeclaration[] = [
  // Profile
  {
    name: "profile_get",
    description:
      "Get the signed-in user's Microsoft profile (name, email, job title, etc.).",
    parameters: { type: "object", properties: {} },
  },

  // Mail
  {
    name: "mail_list_messages",
    description: "List emails from a mail folder. Defaults to the inbox.",
    parameters: {
      type: "object",
      properties: {
        folder: {
          type: "string",
          description:
            "Folder name or well-known name: inbox, sentitems, drafts, deleteditems (default: inbox)",
        },
        search: {
          type: "string",
          description: "Keyword search query (optional)",
        },
        maxResults: {
          type: "integer",
          description: "Max messages to return (default 20, max 50)",
        },
      },
    },
  },
  {
    name: "mail_get_message",
    description: "Fetch the full content of an email by its ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Message ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "mail_send_message",
    description: "Compose and send a new email.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Plain-text email body" },
        cc: { type: "string", description: "CC email address (optional)" },
        bcc: { type: "string", description: "BCC email address (optional)" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "mail_reply_to_message",
    description: "Reply to an existing email.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID of the message to reply to" },
        body: { type: "string", description: "Plain-text reply body" },
      },
      required: ["id", "body"],
    },
  },
  {
    name: "mail_list_folders",
    description: "List the user's Outlook mail folders.",
    parameters: { type: "object", properties: {} },
  },

  // Calendar
  {
    name: "calendar_list_calendars",
    description: "List the user's Outlook calendars.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "calendar_list_events",
    description: "List calendar events within a time range.",
    parameters: {
      type: "object",
      properties: {
        maxResults: {
          type: "integer",
          description: "Max events to return (default 20)",
        },
        startDateTime: {
          type: "string",
          description: "Start of range in ISO 8601 format (default: now)",
        },
        endDateTime: {
          type: "string",
          description: "End of range in ISO 8601 format (optional)",
        },
      },
    },
  },
  {
    name: "calendar_get_event",
    description: "Get details of a specific calendar event by ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Event ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "calendar_create_event",
    description: "Create a new calendar event.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Event title" },
        startDateTime: {
          type: "string",
          description:
            "Start time in ISO 8601 format, e.g. 2026-06-01T10:00:00",
        },
        endDateTime: {
          type: "string",
          description: "End time in ISO 8601 format",
        },
        timeZone: {
          type: "string",
          description: "IANA timezone, e.g. America/Los_Angeles (optional)",
        },
        body: {
          type: "string",
          description: "Event description / agenda (optional)",
        },
        location: {
          type: "string",
          description: "Location display name (optional)",
        },
        attendeeEmails: {
          type: "array",
          items: { type: "string" },
          description: "List of attendee email addresses (optional)",
        },
        isOnlineMeeting: {
          type: "boolean",
          description: "Whether to add a Teams meeting link (optional)",
        },
      },
      required: ["subject", "startDateTime", "endDateTime"],
    },
  },
  {
    name: "calendar_update_event",
    description: "Update an existing calendar event.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Event ID to update" },
        subject: { type: "string", description: "New title (optional)" },
        startDateTime: {
          type: "string",
          description: "New start time in ISO 8601 format (optional)",
        },
        endDateTime: {
          type: "string",
          description: "New end time in ISO 8601 format (optional)",
        },
        timeZone: { type: "string", description: "IANA timezone (optional)" },
        body: { type: "string", description: "New description (optional)" },
        location: { type: "string", description: "New location (optional)" },
      },
      required: ["id"],
    },
  },
  {
    name: "calendar_delete_event",
    description: "Delete a calendar event.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Event ID to delete" },
      },
      required: ["id"],
    },
  },

  // Teams
  {
    name: "teams_list_teams",
    description: "List the Microsoft Teams teams the user has joined.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "teams_list_channels",
    description: "List channels in a Teams team.",
    parameters: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID" },
      },
      required: ["teamId"],
    },
  },
  {
    name: "teams_list_channel_messages",
    description: "List recent messages in a Teams channel.",
    parameters: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID" },
        channelId: { type: "string", description: "Channel ID" },
        maxResults: {
          type: "integer",
          description: "Max messages to return (default 20, max 50)",
        },
      },
      required: ["teamId", "channelId"],
    },
  },

  // Chats
  {
    name: "chats_list",
    description: "List the user's Teams chats (1:1, group, and meeting chats).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "chats_list_messages",
    description: "List recent messages in a Teams chat.",
    parameters: {
      type: "object",
      properties: {
        chatId: { type: "string", description: "Chat ID" },
        maxResults: {
          type: "integer",
          description: "Max messages to return (default 20, max 50)",
        },
      },
      required: ["chatId"],
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
    // Profile
    case "profile_get":
      return G.profileGet(accessToken);

    // Mail
    case "mail_list_messages":
      return G.mailListMessages(
        accessToken,
        args.folder,
        args.search,
        args.maxResults,
      );
    case "mail_get_message":
      return G.mailGetMessage(accessToken, args.id);
    case "mail_send_message":
      return G.mailSendMessage(
        accessToken,
        args.to,
        args.subject,
        args.body,
        args.cc,
        args.bcc,
      );
    case "mail_reply_to_message":
      return G.mailReplyToMessage(accessToken, args.id, args.body);
    case "mail_list_folders":
      return G.mailListFolders(accessToken);

    // Calendar
    case "calendar_list_calendars":
      return G.calendarListCalendars(accessToken);
    case "calendar_list_events":
      return G.calendarListEvents(
        accessToken,
        args.maxResults,
        args.startDateTime,
        args.endDateTime,
      );
    case "calendar_get_event":
      return G.calendarGetEvent(accessToken, args.id);
    case "calendar_create_event": {
      const tz = args.timeZone ?? "UTC";
      const event: Record<string, unknown> = {
        subject: args.subject,
        start: { dateTime: args.startDateTime, timeZone: tz },
        end: { dateTime: args.endDateTime, timeZone: tz },
        ...(args.body
          ? { body: { contentType: "Text", content: args.body } }
          : {}),
        ...(args.location ? { location: { displayName: args.location } } : {}),
        ...(args.attendeeEmails?.length
          ? {
              attendees: args.attendeeEmails.map((e: string) => ({
                emailAddress: { address: e },
                type: "required",
              })),
            }
          : {}),
        ...(args.isOnlineMeeting
          ? { isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness" }
          : {}),
      };
      return G.calendarCreateEvent(accessToken, event);
    }
    case "calendar_update_event": {
      const updates: Record<string, unknown> = {};
      if (args.subject) updates.subject = args.subject;
      if (args.body) updates.body = { contentType: "Text", content: args.body };
      if (args.location) updates.location = { displayName: args.location };
      if (args.startDateTime) {
        updates.start = {
          dateTime: args.startDateTime,
          timeZone: args.timeZone ?? "UTC",
        };
      }
      if (args.endDateTime) {
        updates.end = {
          dateTime: args.endDateTime,
          timeZone: args.timeZone ?? "UTC",
        };
      }
      return G.calendarUpdateEvent(accessToken, args.id, updates);
    }
    case "calendar_delete_event":
      return G.calendarDeleteEvent(accessToken, args.id);

    // Teams
    case "teams_list_teams":
      return G.teamsListJoinedTeams(accessToken);
    case "teams_list_channels":
      return G.teamsListChannels(accessToken, args.teamId);
    case "teams_list_channel_messages":
      return G.teamsListChannelMessages(
        accessToken,
        args.teamId,
        args.channelId,
        args.maxResults,
      );

    // Chats
    case "chats_list":
      return G.chatsListChats(accessToken);
    case "chats_list_messages":
      return G.chatsListMessages(accessToken, args.chatId, args.maxResults);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

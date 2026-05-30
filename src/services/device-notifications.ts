import * as Notifications from 'expo-notifications';

export async function requestNotificationsPermission(): Promise<boolean> {
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

export async function getNotificationsPermission(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function scheduleNotification(options: {
  title: string;
  body: string;
  scheduledDate: Date;
}): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: options.title,
      body: options.body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: options.scheduledDate,
    },
  });
}

export type ScheduledNotification = {
  id: string;
  title: string;
  body: string;
};

export async function listScheduledNotifications(): Promise<ScheduledNotification[]> {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  return notifications.map((n) => ({
    id: n.identifier,
    title: n.content.title ?? '',
    body: n.content.body ?? '',
  }));
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

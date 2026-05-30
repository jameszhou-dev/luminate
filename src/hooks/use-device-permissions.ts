import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  getCalendarPermission,
  getRemindersPermission,
  requestCalendarPermission,
  requestRemindersPermission,
} from '@/services/device-calendar';
import { getContactsPermission, requestContactsPermission } from '@/services/device-contacts';

export type DevicePermissions = {
  contacts: boolean;
  calendar: boolean;
  reminders: boolean;
};

type UseDevicePermissionsResult = {
  permissions: DevicePermissions;
  isLoading: boolean;
  requestAll: () => Promise<DevicePermissions>;
};

export function useDevicePermissions(): UseDevicePermissionsResult {
  const [permissions, setPermissions] = useState<DevicePermissions>({
    contacts: false,
    calendar: false,
    reminders: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }
    checkCurrent();
  }, []);

  async function checkCurrent() {
    const [contacts, calendar, reminders] = await Promise.all([
      getContactsPermission(),
      getCalendarPermission(),
      getRemindersPermission(),
    ]);
    setPermissions({
      contacts: contacts === 'granted',
      calendar: calendar === 'granted',
      reminders: reminders === 'granted',
    });
    setIsLoading(false);
  }

  const requestAll = useCallback(async (): Promise<DevicePermissions> => {
    const [contacts, calendar, reminders] = await Promise.all([
      requestContactsPermission(),
      requestCalendarPermission(),
      requestRemindersPermission(),
    ]);
    const next = { contacts, calendar, reminders };
    setPermissions(next);
    return next;
  }, []);

  return { permissions, isLoading, requestAll };
}

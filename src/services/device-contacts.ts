import * as Contacts from 'expo-contacts';

export async function requestContactsPermission(): Promise<boolean> {
  const { status } = await Contacts.requestPermissionsAsync();
  return status === 'granted';
}

export async function getContactsPermission(): Promise<Contacts.PermissionStatus> {
  const { status } = await Contacts.getPermissionsAsync();
  return status;
}

export async function getContacts(query?: string): Promise<Contacts.Contact[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.Emails,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Addresses,
      Contacts.Fields.Company,
      Contacts.Fields.JobTitle,
      Contacts.Fields.Image,
    ],
    ...(query ? { name: query } : {}),
  });
  return data;
}

export async function getContact(id: string): Promise<Contacts.Contact | undefined> {
  const contact = await Contacts.getContactByIdAsync(id, [
    Contacts.Fields.Name,
    Contacts.Fields.Emails,
    Contacts.Fields.PhoneNumbers,
    Contacts.Fields.Addresses,
    Contacts.Fields.Company,
    Contacts.Fields.JobTitle,
    Contacts.Fields.Image,
    Contacts.Fields.Note,
    Contacts.Fields.Birthday,
  ]);
  return contact ?? undefined;
}

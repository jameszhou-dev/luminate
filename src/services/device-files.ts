import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

const DOCS_DIR = FileSystem.documentDirectory!;

export type FileInfo = {
  name: string;
  size: number;
  modifiedAt: number;
  isDirectory: boolean;
};

export async function listFiles(): Promise<FileInfo[]> {
  const names = await FileSystem.readDirectoryAsync(DOCS_DIR);
  const infos = await Promise.all(
    names.map(async (name) => {
      const info = await FileSystem.getInfoAsync(`${DOCS_DIR}${name}`, { size: true });
      return {
        name,
        size: info.exists && !info.isDirectory ? (info as any).size ?? 0 : 0,
        modifiedAt: info.exists ? (info as any).modificationTime ?? 0 : 0,
        isDirectory: info.exists ? info.isDirectory : false,
      };
    }),
  );
  return infos;
}

export async function readFile(filename: string): Promise<string> {
  return FileSystem.readAsStringAsync(`${DOCS_DIR}${filename}`);
}

export async function writeFile(filename: string, content: string): Promise<void> {
  await FileSystem.writeAsStringAsync(`${DOCS_DIR}${filename}`, content);
}

export async function deleteFile(filename: string): Promise<void> {
  await FileSystem.deleteAsync(`${DOCS_DIR}${filename}`);
}

export async function pickAndReadFile(): Promise<{ name: string; mimeType: string; content: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/*',
      'application/json',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled) throw new Error('User cancelled file picker.');

  const asset = result.assets[0];
  const content = await FileSystem.readAsStringAsync(asset.uri);
  return { name: asset.name, mimeType: asset.mimeType ?? 'text/plain', content };
}

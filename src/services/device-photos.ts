import * as MediaLibrary from 'expo-media-library';

export async function requestPhotosPermission(): Promise<boolean> {
  const { granted } = await MediaLibrary.requestPermissionsAsync();
  return granted;
}

export async function getPhotosPermission(): Promise<string> {
  const { status } = await MediaLibrary.getPermissionsAsync();
  return status;
}

export type PhotoInfo = {
  id: string;
  filename: string;
  mediaType: string;
  width: number;
  height: number;
  creationTime: number;
  duration: number;
  uri: string;
};

export async function listPhotos(options?: {
  first?: number;
  after?: string;
  albumId?: string;
  mediaType?: 'photo' | 'video';
  createdAfter?: Date;
  createdBefore?: Date;
}): Promise<{ assets: PhotoInfo[]; hasNextPage: boolean; endCursor: string }> {
  const result = await MediaLibrary.getAssetsAsync({
    first: options?.first ?? 20,
    after: options?.after,
    album: options?.albumId,
    mediaType: options?.mediaType
      ? ([options.mediaType] as MediaLibrary.MediaType[])
      : [MediaLibrary.MediaType.photo],
    sortBy: [MediaLibrary.SortBy.creationTime],
    createdAfter: options?.createdAfter?.getTime(),
    createdBefore: options?.createdBefore?.getTime(),
  });

  return {
    assets: result.assets.map((a) => ({
      id: a.id,
      filename: a.filename,
      mediaType: a.mediaType,
      width: a.width,
      height: a.height,
      creationTime: a.creationTime,
      duration: a.duration,
      uri: a.uri,
    })),
    hasNextPage: result.hasNextPage,
    endCursor: result.endCursor,
  };
}

export async function listAlbums(): Promise<{ id: string; title: string; assetCount: number }[]> {
  const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
  return albums.map((a) => ({ id: a.id, title: a.title, assetCount: a.assetCount ?? 0 }));
}

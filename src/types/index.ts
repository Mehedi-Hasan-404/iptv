// /src/types/index.ts
export interface Category {
  id: string;
  name: string;
  iconUrl: string;
  slug: string;
  m3uPlaylistUrl?: string; // Add this for M3U playlist support
}

export interface PublicChannel {
  id: string;
  name: string;
  logoUrl: string;
  categoryId: string;
  categoryName: string;
}

export interface AdminChannel extends PublicChannel {
  streamUrl: string;
  authCookie?: string;
  // Remove isM3UPlaylist
}

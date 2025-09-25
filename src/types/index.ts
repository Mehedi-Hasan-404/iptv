// /src/types/index.ts
// Shared type for public data
export interface Category {
  id: string;
  name: string;
  iconUrl: string;
  slug: string;
}

// Type for public channel data (safe to send to client)
export interface PublicChannel {
  id: string;
  name: string;
  logoUrl: string;
  categoryId: string;
  categoryName: string; // Denormalized for easier display
}

// Type for full channel data (only for admin panel)
export interface AdminChannel extends PublicChannel {
  streamUrl: string; // M3U8 stream URL
  authCookie?: string; // Optional authentication cookie
  isM3UPlaylist?: boolean; // Flag to indicate if this is an M3U playlist
}

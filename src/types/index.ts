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
  streamUrl: string; // Primary M3U link
  streamUrl2?: string; // Secondary M3U link
  streamUrl3?: string; // Third M3U link
  streamUrl4?: string; // Fourth M3U link
  streamUrl5?: string; // Fifth M3U link
  authCookie?: string; // Optional authentication cookie
  isM3UPlaylist?: boolean; // Flag to indicate if this is an M3U playlist
}

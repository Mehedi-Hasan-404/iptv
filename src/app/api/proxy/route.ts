import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// This function correctly resolves relative URLs from a playlist
function getAbsoluteUrl(url: string, baseUrl: string): string {
  try {
    // If the URL is already absolute, use it directly.
    // Otherwise, resolve it against the base URL.
    return new URL(url, baseUrl).toString();
  } catch (e) {
    console.error(`Error resolving URL ${url} with base ${baseUrl}:`, e);
    return url; // Fallback to original URL if resolution fails
  }
}

export async function GET(request: NextRequest) {
  const streamUrlString = request.nextUrl.searchParams.get('url');

  if (!streamUrlString) {
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  try {
    const response = await fetch(streamUrlString, {
      headers: {
        // Essential headers to mimic a browser request and avoid some server-side blocks
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        // 'Referer' is crucial for some streams. Use the origin of the streamUrlString.
        'Referer': new URL(streamUrlString).origin,
        // Accept common media types, including HLS and MPEG2-TS
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/dash+xml, video/mp2t, */*',
        // Add more headers if specific streams require them
      },
      redirect: 'follow', // Follow redirects from the upstream server
    });

    if (!response.ok) {
      // Log the upstream status and headers for debugging
      console.error(`Upstream fetch failed for ${streamUrlString}: ${response.status} ${response.statusText}`);
      console.error('Upstream Response Headers:', Object.fromEntries(response.headers.entries()));
      return new NextResponse(`Upstream fetch failed: ${response.status} ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    const newHeaders = new Headers(response.headers); // Start with all upstream headers
    
    // Crucial for CORS: Allow client to read the response
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Range'); // Important for byte-range requests
    newHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range'); // Expose necessary headers to client

    // Prevent caching of proxied content if dynamic or sensitive
    newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    newHeaders.set('Pragma', 'no-cache');
    newHeaders.set('Expires', '0');


    // Check if the content is an M3U8 playlist
    // We check content-type AND file extension for robustness
    if (contentType.includes('mpegurl') || streamUrlString.endsWith('.m3u8')) {
      let playlistText = await response.text();
      
      // Rewrite all URLs inside the playlist to go through our proxy
      const rewrittenPlaylist = playlistText.split('\n').map(line => {
        const trimmedLine = line.trim();
        // Look for lines that don't start with # (comments or directives) and contain a URL
        // A simple heuristic: check for common URL schemes or file extensions
        if (trimmedLine && !trimmedLine.startsWith('#') && (trimmedLine.startsWith('http') || trimmedLine.includes('.ts') || trimmedLine.includes('.m3u8'))) {
          // Resolve to an absolute URL first, then proxy it
          const absoluteUrl = getAbsoluteUrl(trimmedLine, streamUrlString);
          return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      }).join('\n');
      
      // Set the correct content type for M3U8 playlists
      newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new NextResponse(rewrittenPlaylist, { status: 200, headers: newHeaders });
    }

    // If it's not a playlist (e.g., a video chunk), just stream it through
    // Ensure all original headers (like Content-Type, Content-Length) are passed
    return new NextResponse(response.body, { status: response.status, headers: newHeaders });

  } catch (error: any) {
    console.error('Proxy internal error:', error);
    // Include error message in response body for better debugging
    return new NextResponse(`Internal Server Error: ${error.message || 'Unknown error'}`, { status: 500 });
  }
}

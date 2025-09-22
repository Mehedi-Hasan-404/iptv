import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// This function correctly resolves relative URLs from a playlist
function getAbsoluteUrl(url: string, baseUrl: string): string {
  try {
    // If the URL is already absolute, use it directly.
    // Otherwise, resolve it against the base URL.
    return new URL(url, baseUrl).toString();
  } catch (e) {
    console.error(`Error resolving URL "${url}" with base "${baseUrl}":`, e);
    return url; // Fallback to original URL if resolution fails
  }
}

export async function GET(request: NextRequest) {
  const streamUrlString = request.nextUrl.searchParams.get('url');

  if (!streamUrlString) {
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  // Define headers to forward from the client to the upstream server
  const requestHeadersToForward = new Headers();
  const allowedRequestHeaders = ['user-agent', 'referer', 'range', 'accept', 'accept-encoding', 'accept-language']; // Crucial for streams

  allowedRequestHeaders.forEach(headerName => {
    const headerValue = request.headers.get(headerName);
    if (headerValue) {
      requestHeadersToForward.set(headerName, headerValue);
    }
  });

  // Override or set specific headers for the upstream request
  // Ensure a robust User-Agent (mimicking a common browser)
  if (!requestHeadersToForward.has('user-agent')) {
    requestHeadersToForward.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'); // Updated User-Agent
  }
  // Set Referer to the origin of the *requested stream*, not your proxy's origin
  try {
    const refererOrigin = new URL(streamUrlString).origin;
    requestHeadersToForward.set('Referer', refererOrigin);
  } catch (e) {
    console.warn(`Could not determine referer origin for ${streamUrlString}:`, e);
    // Fallback or skip if URL is malformed
  }
  // Ensure Accept header is broad for media
  if (!requestHeadersToForward.has('accept')) {
    requestHeadersToForward.set('Accept', 'application/vnd.apple.mpegurl, application/x-mpegURL, application/dash+xml, video/mp2t, */*');
  }


  try {
    const response = await fetch(streamUrlString, {
      headers: requestHeadersToForward, // Use the carefully constructed headers
      redirect: 'follow', // Follow redirects from the upstream server
    });

    if (!response.ok) {
      console.error(`Upstream fetch failed for ${streamUrlString}: ${response.status} ${response.statusText}`);
      console.error('Upstream Request Headers:', Object.fromEntries(requestHeadersToForward.entries()));
      console.error('Upstream Response Headers:', Object.fromEntries(response.headers.entries()));
      return new NextResponse(`Upstream fetch failed: ${response.status} ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    const newHeaders = new Headers(response.headers); // Start with all upstream headers
    
    // Crucial for CORS: Allow client to read the response
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    // Expose ALL relevant headers to Hls.js for proper playback, including Range, Content-Length, etc.
    newHeaders.set('Access-Control-Expose-Headers', '*'); 

    // Prevent caching of proxied content if dynamic or sensitive
    newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    newHeaders.set('Pragma', 'no-cache');
    newHeaders.set('Expires', '0');


    // Check if the content is an M3U8 playlist
    if (contentType.includes('mpegurl') || streamUrlString.endsWith('.m3u8') || streamUrlString.includes('playlist.m3u')) { // Added common playlist suffixes
      let playlistText = await response.text();
      
      // Rewrite all URLs inside the playlist to go through our proxy
      const rewrittenPlaylist = playlistText.split('\n').map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#') && (trimmedLine.startsWith('http') || trimmedLine.includes('.ts') || trimmedLine.includes('.m3u8') || trimmedLine.includes('.mp4'))) { // Added .mp4
          const absoluteUrl = getAbsoluteUrl(trimmedLine, streamUrlString);
          return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      }).join('\n');
      
      // Set the correct content type for M3U8 playlists if not already present or if it was generic
      if (!newHeaders.has('Content-Type') || !newHeaders.get('Content-Type')?.includes('mpegurl')) {
        newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      }
      
      return new NextResponse(rewrittenPlaylist, { status: 200, headers: newHeaders });
    }

    // For all other content (e.g., video chunks, audio segments)
    // The original headers from the upstream response (including Content-Type, Content-Length, etc.) are passed through
    return new NextResponse(response.body, { status: response.status, headers: newHeaders });

  } catch (error: any) {
    console.error('Proxy internal error:', error);
    // Log the URL that caused the error
    console.error(`Error occurred while proxying: ${streamUrlString}`);
    return new NextResponse(`Internal Server Error: ${error.message || 'Unknown error'}`, { status: 500 });
  }
}

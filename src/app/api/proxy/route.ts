import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// This function correctly resolves relative URLs from a playlist
function getAbsoluteUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': new URL(streamUrlString).origin,
      },
    });

    if (!response.ok) {
      return new NextResponse(`Upstream fetch failed: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET');

    // Check if the content is an M3U8 playlist
    if (contentType.includes('mpegurl') || streamUrlString.endsWith('.m3u8')) {
      let playlistText = await response.text();
      
      // Rewrite all URLs inside the playlist to go through our proxy
      const rewrittenPlaylist = playlistText.split('\n').map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const absoluteUrl = getAbsoluteUrl(trimmedLine, streamUrlString);
          return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      }).join('\n');
      
      return new NextResponse(rewrittenPlaylist, { status: 200, headers: newHeaders });
    }

    // If it's not a playlist (e.g., a video chunk), just stream it through
    return new NextResponse(response.body, { status: 200, headers: newHeaders });

  } catch (error) {
    console.error('Proxy internal error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// src/app/api/proxy/route.ts

import { NextRequest, NextResponse } from 'next-server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const streamUrlString = request.nextUrl.searchParams.get('url');

  if (!streamUrlString) {
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  try {
    const streamUrl = new URL(streamUrlString);
    
    // Fetch the content from the original source
    const response = await fetch(streamUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': streamUrl.origin,
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
    if (contentType.includes('mpegurl') || streamUrl.pathname.endsWith('.m3u8')) {
      let playlistText = await response.text();
      const baseUrl = new URL('.', streamUrl);

      // Rewrite URLs within the playlist
      const rewrittenPlaylist = playlistText.split('\n').map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const absoluteUrl = new URL(trimmedLine, baseUrl);
          return `/api/proxy?url=${encodeURIComponent(absoluteUrl.href)}`;
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

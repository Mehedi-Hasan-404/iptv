// src/app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const streamUrlString = request.nextUrl.searchParams.get('url');

  if (!streamUrlString) {
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  try {
    const streamUrl = new URL(streamUrlString);
    const response = await fetch(streamUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': streamUrl.origin,
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch stream: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    let body: BodyInit;
    
    // Check if it's an M3U8 playlist
    if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegURL') || streamUrl.pathname.endsWith('.m3u8')) {
      let playlist = await response.text();
      const baseUrl = new URL('.', streamUrl).toString();

      // This is the magic part: rewrite the URLs inside the playlist
      const lines = playlist.split('\n');
      const rewrittenLines = lines.map(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const chunkUrl = new URL(line, baseUrl);
          // Prepend our proxy to the chunk URL
          return `/api/proxy?url=${encodeURIComponent(chunkUrl.toString())}`;
        }
        return line;
      });
      
      body = rewrittenLines.join('\n');
    } else {
      // If it's not a playlist (e.g., a video chunk), just stream it
      body = response.body as ReadableStream<Uint8Array>;
    }

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Internal Server Error while fetching the stream.', { status: 500 });
  }
}

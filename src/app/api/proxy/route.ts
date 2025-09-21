// src/app/api/proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const streamUrl = request.nextUrl.searchParams.get('url');

  if (!streamUrl) {
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  try {
    const response = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Proxy failed for ${streamUrl}. Status: ${response.status}`);
      return new NextResponse(`Upstream server returned an error: ${response.status}`, { status: response.status });
    }

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });

  } catch (error) {
    console.error('A critical error occurred in the proxy fetch.', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

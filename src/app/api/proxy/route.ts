// src/app/api/proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get the target stream URL from the query parameters
  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get('url');

  if (!streamUrl) {
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  try {
    // Fetch the M3U8 stream from the original source
    const response = await fetch(streamUrl);

    if (!response.ok) {
      return new NextResponse(`Failed to fetch stream: ${response.statusText}`, {
        status: response.status,
      });
    }

    // Create a new response, streaming the body from the original
    const newHeaders = new Headers(response.headers);

    // This is the magic part: add the CORS header
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Error fetching the stream.', { status: 500 });
  }
}

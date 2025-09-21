// src/app/api/proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get('url');

  if (!streamUrl) {
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  // --- START OF CHANGES ---
  // Create custom headers to make our request look like a real browser
  const headers = new Headers();
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  headers.set('Referer', new URL(streamUrl).origin); // Set a plausible referer
  // --- END OF CHANGES ---

  try {
    // Make the fetch request using our custom headers
    const response = await fetch(streamUrl, { headers: headers });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch stream: ${response.statusText}`, {
        status: response.status,
      });
    }

    const newHeaders = new Headers(response.headers);
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

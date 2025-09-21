// src/app/api/proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Use request.nextUrl which is more reliable on Vercel
  const streamUrl = request.nextUrl.searchParams.get('url');

  if (!streamUrl) {
    console.error('Proxy Error: Missing stream URL in query parameters.');
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  console.log(`Proxying request for URL: ${streamUrl}`);

  try {
    const headers = new Headers();
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Some streams require a referer header, let's add one based on the stream's origin
    try {
      headers.set('Referer', new URL(streamUrl).origin + '/');
    } catch (e) {
      // If streamUrl is not a valid URL for origin, just ignore.
      console.warn(`Could not set referer for invalid URL: ${streamUrl}`);
    }

    // Make the fetch request from the Vercel server
    const response = await fetch(streamUrl, { headers: headers, cache: 'no-store' });

    if (!response.ok) {
      console.error(`Proxy Error: Failed to fetch stream. Status: ${response.status} ${response.statusText}`);
      const responseBody = await response.text();
      console.error(`Proxy Error: Upstream response body: ${responseBody}`);
      return new NextResponse(`Failed to fetch stream: ${response.statusText}`, {
        status: response.status,
      });
    }

    // Stream the response back to the client
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });

  } catch (error) {
    // This will catch network errors, DNS failures, etc.
    console.error('Proxy Error: A critical error occurred in the fetch operation.', error);
    return new NextResponse('Internal Server Error while fetching the stream.', { status: 500 });
  }
}

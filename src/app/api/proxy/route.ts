// src/app/api/proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const streamUrl = request.nextUrl.searchParams.get('url');

  if (!streamUrl) {
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  try {
    // Fetch the stream with a standard browser User-Agent
    const response = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      // Important: Vercel hobby plan has a 10-second timeout. This is a known issue.
      // We can't fix the timeout, but we ensure the request is clean.
    });

    // Check if the fetch was successful
    if (!response.ok) {
      console.error(`Proxy failed for ${streamUrl}. Status: ${response.status}`);
      return new NextResponse(`Upstream server returned an error: ${response.status}`, { status: response.status });
    }

    // Create a new response with the stream's body and headers
    const newHeaders = new Headers(response.headers);
    
    // Add the crucial CORS header
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

export const runtime = 'edge';

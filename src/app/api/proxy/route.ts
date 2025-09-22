import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function getAbsoluteUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch (e) {
    console.error(`Error resolving URL "${url}" with base "${baseUrl}":`, e);
    return url;
  }
}

export async function GET(request: NextRequest) {
  const streamUrlString = request.nextUrl.searchParams.get('url');
  const authCookie = request.nextUrl.searchParams.get('cookie');

  if (!streamUrlString) {
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  const requestHeadersToForward = new Headers();
  
  // Copy important headers from the original request
  const allowedRequestHeaders = ['user-agent', 'referer', 'range', 'accept', 'accept-encoding', 'accept-language'];
  allowedRequestHeaders.forEach(headerName => {
    const headerValue = request.headers.get(headerName);
    if (headerValue) {
      requestHeadersToForward.set(headerName, headerValue);
    }
  });

  // Set proper headers for streaming
  requestHeadersToForward.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Set Origin and Referer based on the stream URL
  try {
    const streamUrl = new URL(streamUrlString);
    requestHeadersToForward.set('Origin', streamUrl.origin);
    requestHeadersToForward.set('Referer', streamUrl.origin + '/');
  } catch (e) {
    console.warn(`Could not parse stream URL: ${streamUrlString}`, e);
  }

  // IMPORTANT: Add the authentication cookie if provided
  if (authCookie) {
    // If the cookie doesn't include the name, assume it's the value only
    if (!authCookie.includes('=')) {
      requestHeadersToForward.set('Cookie', `Edge-Cache-Cookie=${authCookie}`);
    } else {
      requestHeadersToForward.set('Cookie', authCookie);
    }
  }

  // Accept header for HLS content
  requestHeadersToForward.set('Accept', 'application/vnd.apple.mpegurl, application/x-mpegURL, video/mp2t, */*');

  try {
    const response = await fetch(streamUrlString, {
      headers: requestHeadersToForward,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      console.error(`Upstream fetch failed for ${streamUrlString}: ${response.status} ${response.statusText}`);
      return new NextResponse(`Upstream fetch failed: ${response.status} ${response.statusText}`, { 
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        }
      });
    }

    const contentType = response.headers.get('content-type') || '';
    const newHeaders = new Headers();
    
    // Copy important headers from upstream
    const headersToForward = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
    headersToForward.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        newHeaders.set(header, value);
      }
    });
    
    // CORS headers
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    newHeaders.set('Access-Control-Expose-Headers', '*');
    
    // Prevent caching for live streams
    newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    newHeaders.set('Pragma', 'no-cache');
    newHeaders.set('Expires', '0');

    // Check if this is an M3U8 playlist
    const isM3U8 = contentType.includes('mpegurl') || 
                   contentType.includes('m3u8') ||
                   streamUrlString.endsWith('.m3u8') || 
                   streamUrlString.includes('.m3u');

    if (isM3U8) {
      let playlistText = await response.text();
      
      // Process the playlist line by line
      const lines = playlistText.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          return line;
        }
        
        // Check if this line is a URL (for segments or nested playlists)
        if (trimmedLine.includes('.ts') || 
            trimmedLine.includes('.m3u8') || 
            trimmedLine.includes('.mp4') ||
            trimmedLine.startsWith('http') ||
            trimmedLine.startsWith('/')) {
          
          const absoluteUrl = getAbsoluteUrl(trimmedLine, streamUrlString);
          let proxyUrl = `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
          
          // IMPORTANT: Pass along the auth cookie for segment requests
          if (authCookie) {
            proxyUrl += `&cookie=${encodeURIComponent(authCookie)}`;
          }
          
          return proxyUrl;
        }
        
        return line;
      });
      
      const rewrittenPlaylist = rewrittenLines.join('\n');
      
      // Ensure correct content type
      newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      
      return new NextResponse(rewrittenPlaylist, { 
        status: 200, 
        headers: newHeaders 
      });
    }

    // For video segments and other content, stream the response
    return new NextResponse(response.body, { 
      status: response.status, 
      headers: newHeaders 
    });

  } catch (error: any) {
    console.error('Proxy error:', error);
    console.error(`Failed URL: ${streamUrlString}`);
    if (authCookie) {
      console.error(`Auth Cookie was provided: ${authCookie.substring(0, 20)}...`);
    }
    
    const errorMessage = error.name === 'AbortError' 
      ? 'Request timeout - the stream took too long to respond'
      : `Proxy error: ${error.message || 'Unknown error'}`;
    
    return new NextResponse(errorMessage, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      }
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}

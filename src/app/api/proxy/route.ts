import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function getAbsoluteUrl(url: string, baseUrl: string): string {
  try {
    // Handle relative URLs
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    }
    // Handle protocol-relative URLs
    if (url.startsWith('//')) {
      const base = new URL(baseUrl);
      return `${base.protocol}${url}`;
    }
    // Handle absolute URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Handle other relative URLs
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

  // Log for debugging
  console.log('Proxying URL:', streamUrlString);
  if (authCookie) {
    console.log('Auth cookie provided, length:', authCookie.length);
  }

  const requestHeadersToForward = new Headers();
  
  // Set User-Agent
  requestHeadersToForward.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Set Origin and Referer based on the stream URL
  try {
    const streamUrl = new URL(streamUrlString);
    requestHeadersToForward.set('Origin', streamUrl.origin);
    requestHeadersToForward.set('Referer', `${streamUrl.origin}/`);
    
    // Some services need the host header
    requestHeadersToForward.set('Host', streamUrl.host);
  } catch (e) {
    console.warn(`Could not parse stream URL: ${streamUrlString}`, e);
  }

  // Handle authentication cookie
  if (authCookie && authCookie.trim()) {
    // Clean up the cookie value
    let cookieValue = authCookie.trim();
    
    // If it's just the value without the name, add the common cookie name
    if (!cookieValue.includes('=')) {
      cookieValue = `Edge-Cache-Cookie=${cookieValue}`;
    }
    
    requestHeadersToForward.set('Cookie', cookieValue);
    console.log('Setting cookie header:', cookieValue.substring(0, 50) + '...');
  }

  // Accept headers for streaming
  requestHeadersToForward.set('Accept', '*/*');
  requestHeadersToForward.set('Accept-Language', 'en-US,en;q=0.9');
  requestHeadersToForward.set('Accept-Encoding', 'gzip, deflate, br');
  
  // Range support for seeking
  const range = request.headers.get('range');
  if (range) {
    requestHeadersToForward.set('Range', range);
  }

  try {
    const response = await fetch(streamUrlString, {
      method: 'GET',
      headers: requestHeadersToForward,
      redirect: 'follow',
      // @ts-ignore - Next.js specific
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });

    console.log('Upstream response status:', response.status);

    if (!response.ok) {
      console.error(`Upstream error: ${response.status} ${response.statusText}`);
      // Try to get error body for debugging
      const errorText = await response.text().catch(() => 'No error body');
      console.error('Error body:', errorText.substring(0, 200));
      
      return new NextResponse(`Upstream error: ${response.status} ${response.statusText}`, { 
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        }
      });
    }

    const contentType = response.headers.get('content-type') || '';
    const newHeaders = new Headers();
    
    // Copy important headers
    ['content-type', 'content-length', 'accept-ranges', 'content-range', 'etag', 'last-modified'].forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        newHeaders.set(header, value);
      }
    });
    
    // CORS headers
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    newHeaders.set('Access-Control-Expose-Headers', '*');
    newHeaders.set('Access-Control-Allow-Headers', '*');
    
    // Cache control
    newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Check if this is an M3U8 playlist
    const isM3U8 = contentType.includes('mpegurl') || 
                   contentType.includes('m3u8') ||
                   contentType.includes('x-mpegURL') ||
                   streamUrlString.endsWith('.m3u8') || 
                   streamUrlString.includes('.m3u');

    if (isM3U8) {
      const playlistText = await response.text();
      console.log('Processing M3U8 playlist, length:', playlistText.length);
      
      // Process the playlist
      const lines = playlistText.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments (except EXT-X-KEY which might have URIs)
        if (!trimmedLine || (trimmedLine.startsWith('#') && !trimmedLine.includes('URI='))) {
          return line;
        }
        
        // Handle EXT-X-KEY with URI
        if (trimmedLine.startsWith('#EXT-X-KEY') && trimmedLine.includes('URI=')) {
          return line.replace(/URI="([^"]+)"/g, (match, uri) => {
            const absoluteUri = getAbsoluteUrl(uri, streamUrlString);
            let proxyUri = `/api/proxy?url=${encodeURIComponent(absoluteUri)}`;
            if (authCookie) {
              proxyUri += `&cookie=${encodeURIComponent(authCookie)}`;
            }
            return `URI="${proxyUri}"`;
          });
        }
        
        // Check if this line is a URL
        if (trimmedLine.match(/\.(ts|m3u8|mp4|m4s|aac)(\?|$)/i) || 
            trimmedLine.startsWith('http://') ||
            trimmedLine.startsWith('https://') ||
            trimmedLine.startsWith('/')) {
          
          const absoluteUrl = getAbsoluteUrl(trimmedLine, streamUrlString);
          let proxyUrl = `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
          
          if (authCookie) {
            proxyUrl += `&cookie=${encodeURIComponent(authCookie)}`;
          }
          
          return proxyUrl;
        }
        
        return line;
      });
      
      const rewrittenPlaylist = rewrittenLines.join('\n');
      newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      
      return new NextResponse(rewrittenPlaylist, { 
        status: 200, 
        headers: newHeaders 
      });
    }

    // For segments and other content
    return new NextResponse(response.body, { 
      status: response.status, 
      headers: newHeaders 
    });

  } catch (error: any) {
    console.error('Proxy error:', error);
    console.error('Failed URL:', streamUrlString);
    if (authCookie) {
      console.error('Cookie was provided');
    }
    
    return new NextResponse(`Proxy error: ${error.message || 'Unknown error'}`, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      }
    });
  }
}

export async function OPTIONS() {
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

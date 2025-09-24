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

  // Decode the URL in case it's double-encoded
  const decodedUrl = decodeURIComponent(streamUrlString);
  
  console.log('=== PROXY DEBUG ===');
  console.log('Original URL:', streamUrlString);
  console.log('Decoded URL:', decodedUrl);
  if (authCookie) {
    console.log('Cookie provided, first 100 chars:', authCookie.substring(0, 100));
  }

  const requestHeadersToForward = new Headers();
  
  // Parse the stream URL to get host info
  let streamHost = '';
  try {
    const streamUrl = new URL(decodedUrl);
    streamHost = streamUrl.host;
    
    // Set headers that might be required by the streaming service
    requestHeadersToForward.set('Host', streamHost);
    requestHeadersToForward.set('Origin', streamUrl.origin);
    requestHeadersToForward.set('Referer', `${streamUrl.origin}/`);
  } catch (e) {
    console.error('Could not parse stream URL:', e);
  }

  // Set User-Agent
  requestHeadersToForward.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Handle authentication cookie
  if (authCookie && authCookie.trim()) {
    let cookieValue = authCookie.trim();
    
    // Handle different cookie formats
    if (!cookieValue.includes('=')) {
      // If it's just the value, assume it's for Edge-Cache-Cookie
      cookieValue = `Edge-Cache-Cookie=${cookieValue}`;
    }
    
    // Some services might need multiple cookies or specific formatting
    requestHeadersToForward.set('Cookie', cookieValue);
    
    // Also try setting it as a custom header (some services check this)
    if (cookieValue.startsWith('Edge-Cache-Cookie=')) {
      const edgeCacheValue = cookieValue.replace('Edge-Cache-Cookie=', '');
      requestHeadersToForward.set('X-Edge-Cache-Cookie', edgeCacheValue);
    }
    
    console.log('Cookie header set:', cookieValue.substring(0, 50) + '...');
  }

  // Accept headers - updated to accept video formats
  requestHeadersToForward.set('Accept', 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5');
  requestHeadersToForward.set('Accept-Language', 'en-US,en;q=0.9');
  requestHeadersToForward.set('Accept-Encoding', 'gzip, deflate, br');
  requestHeadersToForward.set('Connection', 'keep-alive');
  requestHeadersToForward.set('Sec-Fetch-Dest', 'video');
  requestHeadersToForward.set('Sec-Fetch-Mode', 'no-cors');
  requestHeadersToForward.set('Sec-Fetch-Site', 'cross-site');
  
  // Range support
  const range = request.headers.get('range');
  if (range) {
    requestHeadersToForward.set('Range', range);
    console.log('Range header:', range);
  }

  // Log all headers being sent (for debugging)
  console.log('Headers being sent:');
  requestHeadersToForward.forEach((value, key) => {
    if (key.toLowerCase() === 'cookie') {
      console.log(`  ${key}: ${value.substring(0, 50)}...`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  });

  try {
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: requestHeadersToForward,
      redirect: 'follow',
      // Remove TypeScript ignore and use proper typing
      signal: AbortSignal.timeout(30000),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('Error response body:', errorBody.substring(0, 500));
      
      return new NextResponse(
        `Upstream error: ${response.status} ${response.statusText}\n${errorBody.substring(0, 200)}`, 
        { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Content-Type': 'text/plain',
          }
        }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const newHeaders = new Headers();
    
    // Copy important headers
    ['content-type', 'content-length', 'accept-ranges', 'content-range', 'etag', 'last-modified', 'cache-control'].forEach(header => {
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
    newHeaders.set('Access-Control-Allow-Credentials', 'true');
    
    // Cache control for video streams
    if (!newHeaders.has('Cache-Control')) {
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    // Check if this is an M3U8 playlist
    const isM3U8 = contentType.includes('mpegurl') || 
                   contentType.includes('m3u8') ||
                   contentType.includes('x-mpegURL') ||
                   decodedUrl.endsWith('.m3u8') || 
                   decodedUrl.includes('.m3u');

    if (isM3U8) {
      const playlistText = await response.text();
      console.log('M3U8 playlist received, length:', playlistText.length);
      console.log('First 200 chars:', playlistText.substring(0, 200));
      
      // Process the playlist
      const lines = playlistText.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmedLine = line.trim();
        
        // Skip empty lines and most comments
        if (!trimmedLine || (trimmedLine.startsWith('#') && !trimmedLine.includes('URI='))) {
          return line;
        }
        
        // Handle EXT-X-KEY with URI
        if (trimmedLine.startsWith('#EXT-X-KEY') && trimmedLine.includes('URI=')) {
          return line.replace(/URI="([^"]+)"/g, (match, uri) => {
            const absoluteUri = getAbsoluteUrl(uri, decodedUrl);
            let proxyUri = `/api/proxy?url=${encodeURIComponent(absoluteUri)}`;
            if (authCookie) {
              proxyUri += `&cookie=${encodeURIComponent(authCookie)}`;
            }
            return `URI="${proxyUri}"`;
          });
        }
        
        // Check if this line is a URL
        if (trimmedLine.match(/\.(ts|m3u8|mp4|m4s|aac|key)(\?|$)/i) || 
            trimmedLine.startsWith('http://') ||
            trimmedLine.startsWith('https://') ||
            trimmedLine.startsWith('/') ||
            (!trimmedLine.startsWith('#') && trimmedLine.length > 0)) {
          
          const absoluteUrl = getAbsoluteUrl(trimmedLine, decodedUrl);
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

    // For video streams, ensure proper content type
    if (!contentType && (decodedUrl.includes('/play/') || decodedUrl.includes('stream'))) {
      newHeaders.set('Content-Type', 'video/mp4');
    }

    // For segments and other content
    return new NextResponse(response.body, { 
      status: response.status, 
      headers: newHeaders 
    });

  } catch (error: any) {
    console.error('=== PROXY ERROR ===');
    console.error('Error:', error);
    console.error('URL:', decodedUrl);
    if (authCookie) {
      console.error('Cookie was provided');
    }
    
    return new NextResponse(
      `Proxy error: ${error.message || 'Unknown error'}\nURL: ${decodedUrl}`, 
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// /src/app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function getAbsoluteUrl(url: string, baseUrl: string): string {
  try {
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    }
    if (url.startsWith('//')) {
      const base = new URL(baseUrl);
      return `${base.protocol}${url}`;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
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

  const decodedUrl = decodeURIComponent(streamUrlString);
  
  console.log('=== PROXY DEBUG ===');
  console.log('Original URL:', streamUrlString);
  console.log('Decoded URL:', decodedUrl);

  const requestHeadersToForward = new Headers();
  
  let streamHost = '';
  try {
    const streamUrl = new URL(decodedUrl);
    streamHost = streamUrl.host;
    
    requestHeadersToForward.set('Host', streamHost);
    requestHeadersToForward.set('Origin', streamUrl.origin);
    requestHeadersToForward.set('Referer', `${streamUrl.origin}/`);
  } catch (e) {
    console.error('Could not parse stream URL:', e);
  }

  requestHeadersToForward.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  if (authCookie && authCookie.trim()) {
    let cookieValue = authCookie.trim();
    if (!cookieValue.includes('=')) {
      cookieValue = `Edge-Cache-Cookie=${cookieValue}`;
    }
    requestHeadersToForward.set('Cookie', cookieValue);
  }

  // Accept headers for various stream types
  requestHeadersToForward.set('Accept', '*/*');
  requestHeadersToForward.set('Accept-Language', 'en-US,en;q=0.9');
  requestHeadersToForward.set('Accept-Encoding', 'gzip, deflate, br');
  requestHeadersToForward.set('Connection', 'keep-alive');
  
  const range = request.headers.get('range');
  if (range) {
    requestHeadersToForward.set('Range', range);
  }

  try {
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: requestHeadersToForward,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('Error response body:', errorBody.substring(0, 500));
      
      return new NextResponse(
        `Upstream error: ${response.status} ${response.statusText}`, 
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
    
    // If no content-type, try to detect based on URL or content
    if (!contentType) {
      if (decodedUrl.includes('.m3u8') || decodedUrl.includes('.m3u')) {
        newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      } else if (decodedUrl.includes('.ts')) {
        newHeaders.set('Content-Type', 'video/mp2t');
      } else if (decodedUrl.includes('/play/')) {
        // Likely a video stream
        newHeaders.set('Content-Type', 'video/mp2t'); // MPEG-TS is common for these streams
      }
    }
    
    // CORS headers
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    newHeaders.set('Access-Control-Expose-Headers', '*');
    newHeaders.set('Access-Control-Allow-Headers', '*');
    newHeaders.set('Access-Control-Allow-Credentials', 'true');
    
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
      
      // Process the playlist
      const lines = playlistText.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmedLine = line.trim();
        
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

    // For segments and other content
    return new NextResponse(response.body, { 
      status: response.status, 
      headers: newHeaders 
    });

  } catch (error: any) {
    console.error('=== PROXY ERROR ===');
    console.error('Error:', error);
    console.error('URL:', decodedUrl);
    
    return new NextResponse(
      `Proxy error: ${error.message || 'Unknown error'}`, 
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

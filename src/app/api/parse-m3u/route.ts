// /src/app/api/parse-m3u/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    const text = await response.text();
    
    const channels = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF:')) {
        const info = lines[i];
        const urlLine = lines[i + 1]?.trim();
        
        if (urlLine && !urlLine.startsWith('#')) {
          // Extract channel name
          const nameMatch = info.match(/,(.+)$/);
          const name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
          
                    // Extract logo if available
          const logoMatch = info.match(/tvg-logo="([^"]+)"/);
          const logo = logoMatch ? logoMatch[1] : '';
          
          channels.push({
            name,
            logo,
            url: urlLine
          });
        }
      }
    }
    
    return NextResponse.json(channels);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to parse playlist' }, { status: 500 });
  }
}

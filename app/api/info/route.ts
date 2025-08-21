export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import ytdl from '@distube/ytdl-core';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || '';

    if (!ytdl.validateURL(url)) {
      return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const info = await ytdl.getInfo(url, {
      lang: 'en',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    });

    const allFormats = info.formats || [];
    const progressive = allFormats.filter((f: unknown) => (f as any).hasVideo && (f as any).hasAudio);
    const videoOnly = allFormats.filter((f: unknown) => (f as any).hasVideo && !(f as any).hasAudio);
    const audioOnly = allFormats.filter((f: unknown) => (f as any).hasAudio && !(f as any).hasVideo);

    const mapFmt = (f: unknown) => ({
      itag: (f as any).itag,
      qualityLabel: (f as any).qualityLabel || null,
      bitrate: (f as any).bitrate || (f as any).averageBitrate || null,
      fps: (f as any).fps || null,
      container: (f as any).container || ((f as any).mimeType ? (f as any).mimeType.split(';')[0].split('/')[1] : null),
      codecs: (f as any).codecs || ((f as any).mimeType ? (f as any).mimeType.split('codecs="')[1]?.split('"')[0] : null),
      hasVideo: !!(f as any).hasVideo,
      hasAudio: !!(f as any).hasAudio,
      mimeType: (f as any).mimeType || null
    });

    return Response.json({
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails?.[0]?.url,
      progressive: progressive.map(mapFmt),
      videoOnly: videoOnly.map(mapFmt),
      audioOnly: audioOnly.map(mapFmt)
    });
  } catch (error: unknown) {
    console.error('Info error:', (error as Error)?.message || error);
    return Response.json({
      error: 'Failed to get video info',
      details: (error as Error)?.message || String(error),
      solution: 'Try again later or use a different video'
    }, { status: 500 });
  }
}



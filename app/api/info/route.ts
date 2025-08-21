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
    const progressive = allFormats.filter((f: any) => f.hasVideo && f.hasAudio);
    const videoOnly = allFormats.filter((f: any) => f.hasVideo && !f.hasAudio);
    const audioOnly = allFormats.filter((f: any) => f.hasAudio && !f.hasVideo);

    const mapFmt = (f: any) => ({
      itag: f.itag,
      qualityLabel: f.qualityLabel || null,
      bitrate: f.bitrate || f.averageBitrate || null,
      fps: f.fps || null,
      container: f.container || (f.mimeType ? f.mimeType.split(';')[0].split('/')[1] : null),
      codecs: f.codecs || (f.mimeType ? f.mimeType.split('codecs="')[1]?.split('"')[0] : null),
      hasVideo: !!f.hasVideo,
      hasAudio: !!f.hasAudio,
      mimeType: f.mimeType || null
    });

    return Response.json({
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails?.[0]?.url,
      progressive: progressive.map(mapFmt),
      videoOnly: videoOnly.map(mapFmt),
      audioOnly: audioOnly.map(mapFmt)
    });
  } catch (error: any) {
    console.error('Info error:', error?.message || error);
    return Response.json({
      error: 'Failed to get video info',
      details: error?.message || String(error),
      solution: 'Try again later or use a different video'
    }, { status: 500 });
  }
}



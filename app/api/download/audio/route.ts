export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import ytdl from '@distube/ytdl-core';
import ffmpeg from '@/lib/ffmpeg';
import { PassThrough, Readable } from 'stream';

function nodeStreamToWeb(stream: NodeJS.ReadableStream): ReadableStream {
  return Readable.toWeb(stream as Readable) as ReadableStream;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || '';
    const itag = searchParams.get('itag');
    const format = (searchParams.get('format') || '').toLowerCase();

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

    const title = (info.videoDetails.title || 'audio').replace(/[^\w\s-]/gi, '').trim() || 'audio';

    const audioCandidates = ytdl.filterFormats(info.formats || [], 'audioonly');
    if (!audioCandidates.length) {
      return Response.json({ error: 'No audio formats available' }, { status: 404 });
    }

    let selectedAudio: unknown = itag
      ? audioCandidates.find((f: unknown) => String((f as any).itag) === String(itag))
      : audioCandidates[0];
    if (!selectedAudio) selectedAudio = audioCandidates[0];

    const selectedContainer = (selectedAudio as any).container || ((selectedAudio as any).mimeType ? (selectedAudio as any).mimeType.split(';')[0].split('/')[1] : 'm4a');

    const targetFormat = format || selectedContainer;
    const isSameContainer = !format || format === selectedContainer;

    let filename: string;
    let contentType: string;
    if (targetFormat === 'mp3') {
      filename = `${title}.mp3`;
      contentType = 'audio/mpeg';
    } else if (targetFormat === 'webm' || targetFormat === 'opus') {
      filename = `${title}.webm`;
      contentType = 'audio/webm';
    } else {
      filename = `${title}.m4a`;
      contentType = 'audio/mp4';
    }

    const headers = new Headers({
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });

    const inputStream = ytdl(url, {
      quality: (selectedAudio as any).itag,
      highWaterMark: 1 << 25,
      requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } }
    });

    inputStream.on('error', (err: unknown) => {
      pass.destroy(err as Error);
    });

    if (isSameContainer && targetFormat !== 'mp3') {
      const pass = new PassThrough();
      inputStream.pipe(pass);
      return new Response(nodeStreamToWeb(pass), { headers });
    }

    const pass = new PassThrough();

    const command = ffmpeg().input(inputStream);

    if (targetFormat === 'mp3') {
      command.audioCodec('libmp3lame').format('mp3');
    } else if (targetFormat === 'webm' || targetFormat === 'opus') {
      command.audioCodec('libopus').format('webm');
    } else {
      command.audioCodec('aac').format('mp4');
    }

    command
      .on('error', (err: unknown) => {
        pass.destroy(err as Error);
      })
      .on('start', (cmd: string) => {
        console.log('FFmpeg (audio) started:', cmd);
      })
      .on('end', () => {
        console.log('FFmpeg (audio) finished');
        pass.end();
      });

    command.pipe(pass, { end: true });
    return new Response(nodeStreamToWeb(pass), { headers });
  } catch (error: unknown) {
    console.error('Audio download error:', (error as Error)?.message || error);
    return Response.json({ error: 'Audio download failed', details: (error as Error)?.message || String(error) }, { status: 500 });
  }
}



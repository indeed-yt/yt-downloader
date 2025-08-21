export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import ytdl from '@distube/ytdl-core';
import path from 'path';
import fs from 'fs';
import os from 'os';
import ffmpeg from '@/lib/ffmpeg';
import { PassThrough, Readable } from 'stream';

function nodeStreamToWeb(stream: NodeJS.ReadableStream): ReadableStream {
  // Node 18+: convert Node stream to Web stream
  return Readable.toWeb(stream as Readable) as ReadableStream;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || '';
    const itag = searchParams.get('itag');

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

    const title = (info.videoDetails.title || 'video').replace(/[^\w\s-]/gi, '').trim() || 'video';

    const formats = info.formats || [];
    let selected: unknown = itag ? formats.find((f: unknown) => String((f as any).itag) === String(itag)) : null;
    if (!selected) {
      const progressive = ytdl.filterFormats(formats, 'videoandaudio');
      selected = progressive[0] || ytdl.filterFormats(formats, 'videoonly')[0] || formats[0];
    }

    if (!selected) {
      return Response.json({ error: 'No suitable format found' }, { status: 404 });
    }

    const parseCodecs = (fmt: unknown) => ((fmt as any).codecs || ((fmt as any).mimeType ? (fmt as any).mimeType.split('codecs="')[1]?.split('"')[0] : '')) || '';
    const selectedCodecs = parseCodecs(selected);
    const selectedContainer = (selected as any).container || ((selected as any).mimeType ? (selected as any).mimeType.split(';')[0].split('/')[1] : 'mp4');
    const isProgressive = !!(selected as any).hasVideo && !!(selected as any).hasAudio;

    if (isProgressive) {
      const filename = `${title}.${selectedContainer || 'mp4'}`;
      const headers = new Headers({
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': `video/${selectedContainer || 'mp4'}`,
        'Cache-Control': 'no-store'
      });

      const stream = ytdl(url, {
        quality: (selected as any).itag,
        highWaterMark: 1 << 25,
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      });

      const pass = new PassThrough();
      stream.on('error', (err: unknown) => {
        pass.destroy(err as Error);
      });
      stream.pipe(pass);
      return new Response(nodeStreamToWeb(pass), { headers });
    }

    const audioCandidates = ytdl.filterFormats(formats, 'audioonly');
    let chosenAudio: unknown = audioCandidates.find((a: unknown) => {
      const outContainerGuess = selectedContainer || 'mp4';
      return ((a as any).container || '').includes(outContainerGuess) || ((a as any).mimeType || '').includes(outContainerGuess);
    });
    if (!chosenAudio) chosenAudio = audioCandidates[0];
    if (!chosenAudio) {
      return Response.json({ error: 'No suitable audio format found to mux with video.' }, { status: 404 });
    }

    const videoCodec = (selectedCodecs || '').toLowerCase();
    const isH264 = videoCodec.includes('avc1') || videoCodec.includes('h264');
    const outContainer = isH264 ? 'mp4' : 'webm';

    const filename = `${title}.${outContainer}`;
    const headers = new Headers({
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': `video/${outContainer}`,
      'Cache-Control': 'no-store'
    });

    const tmpDir = path.join(os.tmpdir(), `ytmux-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.promises.mkdir(tmpDir, { recursive: true });

    const videoExt = selectedContainer || (selected as any).mimeType ? (selected as any).mimeType.split(';')[0].split('/')[1] : 'mp4';
    const audioExtGuess = (chosenAudio as any).container || (chosenAudio as any).mimeType ? (chosenAudio as any).mimeType.split(';')[0].split('/')[1] : 'm4a';
    const audioExt = audioExtGuess === 'mp4' ? 'm4a' : audioExtGuess;
    const videoFile = path.join(tmpDir, `video.${videoExt}`);
    const audioFile = path.join(tmpDir, `audio.${audioExt}`);

    const writeToFile = (readable: NodeJS.ReadableStream, destPath: string) => new Promise<void>((resolve, reject) => {
      const writable = fs.createWriteStream(destPath);
      readable.pipe(writable);
      writable.on('finish', () => resolve());
      writable.on('error', reject);
      readable.on('error', reject);
    });

    const videoReadable = ytdl(url, {
      quality: (selected as any).itag,
      highWaterMark: 1 << 25,
      requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } }
    });
    const audioReadable = ytdl(url, {
      quality: (chosenAudio as any).itag,
      highWaterMark: 1 << 25,
      requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } }
    });

    await Promise.all([
      writeToFile(videoReadable, videoFile),
      writeToFile(audioReadable, audioFile)
    ]);

    const cleanup = async () => {
      try { await fs.promises.unlink(videoFile).catch(() => {}); } catch {}
      try { await fs.promises.unlink(audioFile).catch(() => {}); } catch {}
      try { await fs.promises.rmdir(tmpDir).catch(() => {}); } catch {}
    };

    const pass = new PassThrough();

    const command = ffmpeg()
      .input(videoFile)
      .input(audioFile)
      .on('stderr', (line: string) => {
        console.log('FFmpeg:', line);
      })
      .on('error', async (err: unknown) => {
        console.error('FFmpeg error:', (err as Error)?.message || err);
        pass.destroy(err as Error);
        await cleanup();
      })
      .on('start', (cmd: string) => {
        console.log('FFmpeg started:', cmd);
      })
      .on('end', async () => {
        console.log('FFmpeg finished');
        pass.end();
        await cleanup();
      });

    if (outContainer === 'mp4') {
      command
        .outputOptions([
          '-map 0:v:0',
          '-map 1:a:0',
          '-c:v copy',
          '-c:a aac',
          '-b:a 192k',
          '-movflags +frag_keyframe+empty_moov',
          '-shortest'
        ])
        .format('mp4');
    } else {
      command
        .outputOptions([
          '-map 0:v:0',
          '-map 1:a:0',
          '-c:v copy',
          '-c:a copy',
          '-shortest'
        ])
        .format('webm');
    }

    command.pipe(pass, { end: true });
    return new Response(nodeStreamToWeb(pass), { headers });
  } catch (error: unknown) {
    console.error('Download error:', (error as Error)?.message || error);
    return Response.json({
      error: 'Download failed',
      details: (error as Error)?.message || String(error),
      possibleSolutions: [
        'Try again in a few minutes',
        'Check if the video is available',
        'Try a different video quality',
        'Select a different container if merging fails'
      ]
    }, { status: 500 });
  }
}



import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

if (ffmpegStatic) {
  // @ts-expect-error fluent-ffmpeg expects a string path
  ffmpeg.setFfmpegPath(ffmpegStatic as string);
}

export default ffmpeg;



"use client";

import React, { useMemo, useState } from 'react';

type Nullable<T> = T | null | undefined;

type Format = {
    itag: number;
    qualityLabel: Nullable<string>;
    bitrate: Nullable<number>;
    fps: Nullable<number>;
    container: string;
    codecs: string;
    hasVideo: boolean;
    hasAudio: boolean;
    mimeType: string;
};

type InfoResponse = {
    title: string;
    thumbnail: string;
    progressive: Format[];
    videoOnly: Format[];
    audioOnly: Format[];
};

type Props = {
    baseUrl: string;
};

function formatBitrate(bps: Nullable<number>): string {
    if (!bps || bps <= 0) return '—';
    if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
    if (bps >= 1_000) return `${Math.round(bps / 1_000)} kbps`;
    return `${bps} bps`;
}

function dedupeByItag(formats: Format[]): Format[] {
    const seen = new Set<number>();
    const unique: Format[] = [];
    for (const f of formats) {
        if (!seen.has(f.itag)) {
            seen.add(f.itag);
            unique.push(f);
        }
    }
    return unique;
}

const VideoDownloader: React.FC<Props> = ({ baseUrl }) => {
    const [urlInput, setUrlInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [info, setInfo] = useState<InfoResponse | null>(null);
    const [audioFormat, setAudioFormat] = useState<'auto' | 'mp3' | 'm4a' | 'webm' | 'opus'>('auto');

    const progressiveFormats = useMemo(() => dedupeByItag(info?.progressive ?? []), [info]);
    const videoOnlyFormats = useMemo(() => dedupeByItag(info?.videoOnly ?? []), [info]);
    const audioOnlyFormats = useMemo(() => dedupeByItag(info?.audioOnly ?? []), [info]);

    async function fetchInfo() {
        setError('');
        setInfo(null);
        const url = urlInput.trim();
        if (!url) {
            setError('Please enter a YouTube URL');
            return;
        }
        try {
            console.log(baseUrl,111);
            
            setLoading(true);
            const res = await fetch(`${baseUrl.replace(/\/$/, '')}/info?url=${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error(`Failed to fetch info (${res.status})`);
            const data: InfoResponse = await res.json();
            setInfo(data);
        } catch (e: any) {
            setError(e?.message || 'Something went wrong fetching video info');
        } finally {
            setLoading(false);
        }
    }

    function buildDownloadUrl(params: Record<string, Nullable<string | number>>): string {
        const url = new URL(`${baseUrl.replace(/\/$/, '')}/download`, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && `${value}`.length > 0) {
                url.searchParams.set(key, String(value));
            }
        });
        return url.toString();
    }

    function buildAudioDownloadUrl(params: Record<string, Nullable<string | number>>): string {
        const url = new URL(`${baseUrl.replace(/\/$/, '')}/download/audio`, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && `${value}`.length > 0) {
                url.searchParams.set(key, String(value));
            }
        });
        return url.toString();
    }

    function triggerDownload(href: string) {
        const a = document.createElement('a');
        a.href = href;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function onDownloadProgressive(fmt: Format) {
        const href = buildDownloadUrl({ url: urlInput.trim(), itag: fmt.itag });
        triggerDownload(href);
    }

    function onDownloadVideoOnly(fmt: Format) {
        const href = buildDownloadUrl({ url: urlInput.trim(), itag: fmt.itag });
        triggerDownload(href);
    }

    function onDownloadAudio(fmt?: Format) {
        const params: Record<string, Nullable<string | number>> = {
            url: urlInput.trim(),
            itag: fmt?.itag,
            format: audioFormat === 'auto' ? null : audioFormat,
        };
        const href = buildAudioDownloadUrl(params);
        triggerDownload(href);
    }

    function handleDownloadWithPreparing(fmt: Format, type: 'video' | 'audio') {
        if (type === 'video') {
            onDownloadProgressive(fmt); // or onDownloadVideoOnly(fmt)
        } else {
            onDownloadAudio(fmt);
        }
    }

    return (
        <div className="video-downloader-container min-h-screen bg-black text-white px-2 py-6 flex flex-col items-center">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-2xl mb-8">
                <input
                    className="bg-[#262626] w-full sm:w-96 h-12 rounded-md pl-4 text-lg outline-none border border-neutral-800 focus:border-[#dc3545] transition"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste YouTube URL"
                    type="text"
                    spellCheck={false}
                />
                <button
                    className="h-12 px-8 bg-[#dc3545] text-white rounded-md text-lg font-semibold hover:bg-[#dc3545]/90 transition disabled:opacity-60"
                    disabled={loading}
                    onClick={fetchInfo}
                >
                    {loading ? 'Loading…' : 'Download'}
                </button>
            </div>

            {error && <div className="text-red-400 mb-4">{error}</div>}

            {info && (
                <div className="video-info w-full max-w-3xl bg-[#181818] rounded-lg p-6 shadow-lg flex flex-col items-center">
                    <h3 className="text-2xl font-bold mb-2 text-center">{info.title}</h3>
                    <img className="thumbnail w-48 rounded-lg mb-6 shadow" src={info.thumbnail} alt={info.title} />

                    {/* Video + Audio */}
                    {progressiveFormats.length > 0 && (
                        <section className="w-full mb-8">
                            <h4 className="text-lg font-semibold mb-3">Video (with audio)</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {progressiveFormats.map((fmt) => (
                                    <button
                                        key={`p-${fmt.itag}`}
                                        className="bg-[#dc3545] text-white rounded-lg p-4 flex flex-col items-center hover:bg-[#b52a37] transition"
                                        onClick={() => handleDownloadWithPreparing(fmt, 'video')}
                                    >
                                        <div className="font-bold text-lg">{fmt.qualityLabel ?? '—'} <span className="text-xs">({fmt.container.toUpperCase()})</span></div>
                                        <div className="text-xs">{formatBitrate(fmt.bitrate)} • {fmt.fps ?? '—'} fps</div>
                                        <div className="text-xs opacity-60">itag {fmt.itag}</div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Video Only */}
                    {videoOnlyFormats.length > 0 && (
                        <section className="w-full mb-8">
                            <h4 className="text-lg font-semibold mb-3">Video Only (no audio)</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {videoOnlyFormats.map((fmt) => (
                                    <div key={`v-${fmt.itag}`} className="bg-[#232323] rounded-lg p-4 flex flex-col items-center">
                                        <div className="font-bold text-lg">{fmt.qualityLabel ?? '—'} <span className="text-xs">({fmt.container.toUpperCase()})</span></div>
                                        <div className="text-xs">{formatBitrate(fmt.bitrate)} • {fmt.fps ?? '—'} fps</div>
                                        <div className="text-xs opacity-60">itag {fmt.itag}</div>
                                        <button
                                            className="mt-3 bg-[#dc3545] text-white rounded px-4 py-2 text-sm font-semibold hover:bg-[#b52a37] transition"
                                            onClick={() => onDownloadVideoOnly(fmt)}
                                        >
                                            Download (muxed)
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Audio Only */}
                    {audioOnlyFormats.length > 0 && (
                        <section className="w-full">
                            <h4 className="text-lg font-semibold mb-3">Audio Only</h4>
                            <div className="flex flex-wrap gap-4 items-center mb-4">
                                <label htmlFor="audio-format-select" className="text-sm">Format:</label>
                                <select
                                    id="audio-format-select"
                                    value={audioFormat}
                                    onChange={(e) => setAudioFormat(e.target.value as 'auto' | 'mp3' | 'm4a' | 'webm' | 'opus')}
                                    className="bg-[#232323] text-white rounded px-3 py-2"
                                >
                                    <option value="auto">Original (no re-encode)</option>
                                    <option value="mp3">MP3</option>
                                    <option value="m4a">M4A</option>
                                    <option value="webm">WebM</option>
                                    <option value="opus">Opus</option>
                                </select>
                                <button
                                    className="bg-[#dc3545] text-white rounded px-4 py-2 text-sm font-semibold hover:bg-[#b52a37] transition"
                                    onClick={() => onDownloadAudio()}
                                >
                                    Download best audio
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {audioOnlyFormats.map((fmt) => (
                                    <button
                                        key={`a-${fmt.itag}`}
                                        className="bg-[#dc3545] text-white rounded-lg p-4 flex flex-col items-center hover:bg-[#b52a37] transition"
                                        onClick={() => onDownloadAudio(fmt)}
                                    >
                                        <div className="font-bold text-lg">{fmt.container.toUpperCase()} <span className="text-xs">{fmt.codecs.includes('opus') ? 'Opus' : fmt.codecs}</span></div>
                                        <div className="text-xs">{formatBitrate(fmt.bitrate)}</div>
                                        <div className="text-xs opacity-60">itag {fmt.itag}</div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoDownloader;



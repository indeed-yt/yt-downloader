export function buildYouTubeHeaders(): Record<string, string> {
	const env = ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })?.process?.env) || {};
	const userAgent = env.YTDL_UA ||
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
	const acceptLanguage = env.YTDL_ACCEPT_LANGUAGE || 'en-US,en;q=0.9';
	const clientVersion = env.YTDL_CLIENT_VERSION || '2.20240722.10.00';
	const cookie = env.YTDL_COOKIE;

	const headers: Record<string, string> = {
		'User-Agent': userAgent,
		'Accept-Language': acceptLanguage,
		'Accept': '*/*',
		'Referer': 'https://www.youtube.com',
		'Origin': 'https://www.youtube.com',
		'x-youtube-client-name': '1',
		'x-youtube-client-version': clientVersion
	};

	if (cookie && cookie.trim().length > 0) {
		headers['Cookie'] = cookie.trim();
	}

	return headers;
}



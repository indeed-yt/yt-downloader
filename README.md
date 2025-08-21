This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## YouTube anti-bot mitigation

Some regions and build environments trigger YouTube bot checks that respond with "Sign in to confirm you’re not a bot". This project sends realistic headers and supports optional cookies via environment variables.

Set these (locally in a `.env.local`, and on Vercel as Project → Settings → Environment Variables):

```
# Optional but recommended
YTDL_UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
YTDL_ACCEPT_LANGUAGE=en-US,en;q=0.9
YTDL_CLIENT_VERSION=2.20240722.10.00

# Optional: copy your YouTube cookie from a signed-in browser session
# Example (DO NOT paste quotes from devtools; paste the raw cookie string)
# YTDL_COOKIE=VISITOR_INFO1_LIVE=...; PREF=...; SID=...; HSID=...; SSID=...
```

Notes:
- If you use `YTDL_COOKIE`, prefer cookies from an account with 2FA and avoid exposing secrets. Rotate if leaked.
- Vercel: set the vars for `Production`, `Preview`, and `Development` as needed. Redeploy after changes.
- If you still hit the message, try updating `YTDL_CLIENT_VERSION` to a recent web client version.

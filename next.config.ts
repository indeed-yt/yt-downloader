import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "fluent-ffmpeg",
    "ffmpeg-static",
    "@distube/ytdl-core"
  ],
  images: {
    domains: ["i.ytimg.com"]
  }
};

export default nextConfig;

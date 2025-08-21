import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "fluent-ffmpeg",
    "ffmpeg-static",
    "@distube/ytdl-core"
  ]
};

export default nextConfig;

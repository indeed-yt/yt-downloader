import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "fluent-ffmpeg",
      "ffmpeg-static",
      "@distube/ytdl-core"
    ]
  }
};

export default nextConfig;

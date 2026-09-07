import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? "/odinventario" : "",
  trailingSlash: isGithubPages ? true : false,
  images: {
    unoptimized: true,
  },
  // Allow access from server IP and reverse proxy port
  // @ts-ignore
  allowedDevOrigins: [
    "192.168.100.2",
    "192.168.100.2:8088",
    "localhost",
    "localhost:8088"
  ],
};

export default nextConfig;

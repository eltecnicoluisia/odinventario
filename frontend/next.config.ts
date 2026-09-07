import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

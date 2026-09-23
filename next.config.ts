import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: [
    "unnestled-bailey-anxiously.ngrok-free.dev",
    "localhost:3000",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/djvocpk25/image/upload/**",
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old routes from the previous site keep working and land on the matching section.
  async redirects() {
    return [
      { source: "/about", destination: "/#calibration", permanent: true },
      { source: "/aboutme", destination: "/#calibration", permanent: true },
      { source: "/timeline/:path*", destination: "/#trajectory", permanent: true },
      { source: "/portfolio/:path*", destination: "/#landmarks", permanent: true },
      { source: "/blog/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plan max is 5 MB per file; leave headroom for multipart form overhead.
  serverActions: {
    bodySizeLimit: "6mb",
  },
};

export default nextConfig;

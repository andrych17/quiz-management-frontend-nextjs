import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set the output file tracing root to suppress warnings
  outputFileTracingRoot: path.join(__dirname),
  
  // Use Turbopack by default in Next.js 16
  turbopack: {},
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  // "graph" (Turbopack): CSS dzielony wg tras — strona główna nie dostaje już @font-face
  // 11 rodzin fontów inwestycji (51 KB blokującego CSS -> 7 KB); inwestycje mają 1 plik CSS więcej.
  experimental: { cssChunking: "graph" },
  images: {
    unoptimized: true,
  },
  generateBuildId: async () => {
    return "production-build";
  },
};

export default nextConfig;
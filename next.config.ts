import type { NextConfig } from "next";

const isRenderStaticBuild = process.env.RENDER_STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(isRenderStaticBuild ? { output: "export", trailingSlash: true } : {}),
};

export default nextConfig;

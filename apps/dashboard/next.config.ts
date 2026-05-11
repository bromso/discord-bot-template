import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@repo/db", "@repo/config", "@repo/i18n", "@repo/logger", "@repo/ui"],
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default config;

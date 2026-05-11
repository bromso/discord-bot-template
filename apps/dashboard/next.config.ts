import type { NextConfig } from "next";

// Dev uses Turbopack (--turbopack in package.json), prod builds use --webpack.
// Turbopack's resolveExtensions only adds fallbacks; it can't rewrite .js -> .ts/.tsx
// the way webpack's extensionAlias does. Until Turbopack supports rewrite-aliases
// (or we drop NodeNext-style .js extensions across the monorepo), production
// build is pinned to --webpack in package.json.
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

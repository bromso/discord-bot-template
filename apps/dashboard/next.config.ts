import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: ["@repo/db", "@repo/config", "@repo/i18n", "@repo/logger", "@repo/ui"],
};
export default config;

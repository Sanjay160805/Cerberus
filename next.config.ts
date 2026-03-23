import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@hashgraph/sdk"],
  webpack: (config, { isServer }) => {
    config.externals.push("better-sqlite3");

    // Stub optional @reown/appkit deps that hedera-wallet-connect imports
    // but are not required for the DAppConnector + extension flow we use
    const reownStubs = [
      "@reown/appkit-controllers",
      "@reown/appkit-common",
      "@reown/appkit-utils",
      "@reown/appkit-wallet",
      "@reown/appkit",
    ];
    for (const pkg of reownStubs) {
      config.resolve.alias[pkg] = path.resolve("src/lib/emptyModule.js");
    }

    return config;
  },
};

export default nextConfig;
